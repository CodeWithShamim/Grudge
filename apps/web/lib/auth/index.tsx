"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  usePrivy,
  useWallets,
  useLoginWithEmail,
  useLogout,
  useExportWallet,
  useCreateWallet,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { registerEmbeddedSigner, type Eip1193Provider } from "@/lib/chain/authBridge";
import { defineBradbury } from "@/lib/chain/bradbury";

/**
 * THE single auth abstraction. This is the ONLY module in the app that imports
 * Privy — every component consumes these hooks. Swapping the auth provider
 * later means touching only this file.
 *
 * Login is email magic-code (Privy headless flow); on first login Privy
 * provisions an embedded wallet whose key it custodies, so writes sign
 * silently with no popup.
 *
 * Two hooks, split by concern so the email flow doesn't re-render the app:
 *   - useAuth()       session + wallet lifecycle (consumed app-wide)
 *   - useEmailLogin() the email code flow (consumed only by the login screen)
 */

export interface AuthSession {
  address: `0x${string}`;
  email?: string;
}

export interface UseAuthResult {
  session: AuthSession | null;
  /** Privy is still initializing (don't render auth UI as a final state yet). */
  loading: boolean;
  /** Authenticated, but the embedded wallet is still being provisioned. */
  provisioning: boolean;
  logout: () => Promise<void>;
  exportWallet: () => Promise<void>;
  /** Privy access token for authorizing protected API calls (or null). */
  getAccessToken: () => Promise<string | null>;
}

const GENLAYER_CHAIN_ID = defineBradbury().id;

/**
 * Session + embedded-wallet lifecycle. Wires the embedded wallet into the
 * genlayer-js signing bridge, ensures a wallet exists, and keeps it on the
 * GenLayer chain — all keyed on the stable address so Privy store ticks don't
 * cause re-render / network storms.
 */
export function useAuth(): UseAuthResult {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { logout: privyLogout } = useLogout();
  const { exportWallet: privyExport } = useExportWallet();
  const { createWallet } = useCreateWallet();

  const embedded = useMemo(() => getEmbeddedConnectedWallet(wallets), [wallets]);
  const provisioning = ready && authenticated && !embedded;

  // Derive a STABLE address string. `embedded` is a fresh object on every Privy
  // store tick (useWallets re-emits a new array), but its address rarely
  // changes — so memoize session on the primitives, not the object. This keeps
  // `session`'s identity stable, so app-wide consumers don't re-render on ticks.
  const walletAddress =
    ready && authenticated && embedded ? (embedded.address as `0x${string}`) : null;
  const email = user?.email?.address;

  const session: AuthSession | null = useMemo(
    () => (walletAddress ? { address: walletAddress, email } : null),
    [walletAddress, email],
  );

  // Ensure an embedded wallet exists. Privy's createOnLogin usually handles
  // this; the fallback covers config drift / returning users / races. Fires at
  // most once per authenticated session.
  const creating = useRef(false);
  useEffect(() => {
    if (!authenticated) {
      creating.current = false;
      return;
    }
    if (!provisioning || creating.current) return;
    creating.current = true;
    void createWallet().catch(() => {
      // a wallet may already exist / be in-flight — useWallets will catch up
    });
  }, [authenticated, provisioning, createWallet]);

  // Mirror the embedded wallet into the plain-TS signing bridge. Switch it to
  // the GenLayer chain FIRST (Privy provisions on a default chain), then
  // re-fetch the provider. Keyed on the stable address so it runs once per
  // wallet, not on every Privy tick.
  const address = walletAddress;
  const registeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!address || !embedded) {
      registerEmbeddedSigner(null);
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === address) return;
    registeredFor.current = address;

    let cancelled = false;
    void (async () => {
      try {
        await embedded.switchChain(GENLAYER_CHAIN_ID);
      } catch {
        // already on the right chain, or switchChain unsupported
      }
      const provider = await embedded.getEthereumProvider();
      if (cancelled) return;
      registerEmbeddedSigner({ address, provider: provider as unknown as Eip1193Provider });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the stable address
  }, [address]);

  const logout = useCallback(async () => {
    registerEmbeddedSigner(null);
    registeredFor.current = null;
    await privyLogout();
  }, [privyLogout]);

  const exportWallet = useCallback(() => privyExport(), [privyExport]);
  const token = useCallback(async () => (await getAccessToken()) ?? null, [getAccessToken]);

  return useMemo(
    () => ({ session, loading: !ready, provisioning, logout, exportWallet, getAccessToken: token }),
    [session, ready, provisioning, logout, exportWallet, token],
  );
}

// ── email login flow (used only by the login screen) ────────────────────────

export type EmailStep = "initial" | "sending" | "awaiting-code" | "submitting" | "error";

export interface UseEmailLoginResult {
  step: EmailStep;
  /** True once a code has been requested — the UI shows the code form. */
  codeRequested: boolean;
  sendCode: (email: string) => Promise<void>;
  confirmCode: (code: string) => Promise<void>;
}

/** Maps Privy's OTP flow status to our simplified, derived step (no extra state). */
function toStep(status: string): EmailStep {
  switch (status) {
    case "sending-code":
      return "sending";
    case "awaiting-code-input":
      return "awaiting-code";
    case "submitting-code":
      return "submitting";
    case "error":
      return "error";
    default:
      return "initial";
  }
}

export function useEmailLogin(): UseEmailLoginResult {
  const { sendCode: privySendCode, loginWithCode, state } = useLoginWithEmail();

  // Derived directly from Privy — no duplicate useState/effect to drift.
  const step = toStep(state.status);
  // Whether a code has been requested is a flow fact, not UI bookkeeping: any
  // state past "initial"/"sending" means we're on the code step (a wrong code
  // moves Privy to "error", but we must STAY on the code form).
  const codeRequested =
    state.status === "awaiting-code-input" ||
    state.status === "submitting-code" ||
    state.status === "error";

  const sendCode = useCallback((email: string) => privySendCode({ email }), [privySendCode]);
  const confirmCode = useCallback((code: string) => loginWithCode({ code }), [loginWithCode]);

  return useMemo(
    () => ({ step, codeRequested, sendCode, confirmCode }),
    [step, codeRequested, sendCode, confirmCode],
  );
}
