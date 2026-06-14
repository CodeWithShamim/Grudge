"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePrivy,
  useWallets,
  useLoginWithEmail,
  useLogout,
  useExportWallet,
  useCreateWallet,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { registerEmbeddedSigner } from "@/lib/chain/authBridge";
import { defineBradbury } from "@/lib/chain/bradbury";

/**
 * THE single auth abstraction. This is the ONLY module in the app that imports
 * Privy — every component consumes `useAuth()`. Swapping the auth provider
 * later means touching only this file.
 *
 * Login is email magic-code (Privy headless flow); on first login Privy
 * provisions an embedded wallet whose key it custodies, so writes sign
 * silently with no popup.
 */

export interface AuthSession {
  address: `0x${string}`;
  email?: string;
  ready: boolean;
  authenticated: boolean;
}

export type EmailFlowState =
  | "initial"
  | "sending-code"
  | "awaiting-code"
  | "submitting-code"
  | "error";

export interface UseAuthResult {
  session: AuthSession | null;
  loading: boolean;
  /** Authenticated, but the embedded wallet is still being provisioned. */
  provisioning: boolean;
  /** Email flow: request a one-time code, then confirm it. */
  emailState: EmailFlowState;
  sendCode: (email: string) => Promise<void>;
  confirmCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  exportWallet: () => Promise<void>;
}

// useAuth always runs under a PrivyProvider (AuthProviders guarantees it — see
// that file's invariant), so the Privy hooks below are called unconditionally.
export function useAuth(): UseAuthResult {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { sendCode: privySendCode, loginWithCode, state } = useLoginWithEmail();
  const { logout: privyLogout } = useLogout();
  const { exportWallet: privyExport } = useExportWallet();
  const { createWallet } = useCreateWallet();

  const embedded = useMemo(() => getEmbeddedConnectedWallet(wallets), [wallets]);

  // Authenticated but no embedded wallet yet → it's still provisioning.
  const provisioning = ready && authenticated && !embedded;

  // Fallback: if Privy didn't auto-create the embedded wallet on login
  // (config drift, race, or a returning user without one), create it
  // explicitly. Guarded so it fires at most once per authenticated session.
  const creating = useRef(false);
  useEffect(() => {
    if (!provisioning || creating.current) return;
    creating.current = true;
    void (async () => {
      try {
        await createWallet();
      } catch {
        // a wallet may already exist / be in-flight — useWallets will catch up
      }
    })();
  }, [provisioning, createWallet]);

  // reset the create-guard when the user logs out
  useEffect(() => {
    if (!authenticated) creating.current = false;
  }, [authenticated]);

  const session: AuthSession | null = useMemo(() => {
    if (!ready || !authenticated || !embedded) return null;
    return {
      address: embedded.address as `0x${string}`,
      email: user?.email?.address,
      ready,
      authenticated,
    };
  }, [ready, authenticated, embedded, user?.email?.address]);

  // Mirror the embedded wallet into the plain-TS bridge so the genlayer-js
  // adapter can sign without importing React/Privy. Switch the embedded wallet
  // to the GenLayer chain FIRST — Privy provisions wallets on a default chain.
  //
  // Keyed on the STABLE address string, not the `embedded`/`session` object
  // references (useWallets re-emits a fresh array often). Without this the
  // effect re-fired on every Privy tick, calling switchChain (a network
  // round-trip) repeatedly and thrashing the UI.
  const address = session?.address ?? null;
  const registeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!address || !embedded) {
      registerEmbeddedSigner(null);
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === address) return; // already wired this wallet
    registeredFor.current = address;

    let cancelled = false;
    void (async () => {
      try {
        await embedded.switchChain(defineBradbury().id);
      } catch {
        // already on the right chain, or switchChain unsupported
      }
      const provider = await embedded.getEthereumProvider();
      if (cancelled) return;
      registerEmbeddedSigner({
        address,
        provider: provider as unknown as import("@/lib/chain/authBridge").Eip1193Provider,
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on stable address
  }, [address]);

  const [emailState, setEmailState] = useState<EmailFlowState>("initial");
  // Keep our simplified flow state in sync with Privy's internal state machine.
  useEffect(() => {
    const s = state.status;
    if (s === "sending-code") setEmailState("sending-code");
    else if (s === "awaiting-code-input") setEmailState("awaiting-code");
    else if (s === "submitting-code") setEmailState("submitting-code");
    else if (s === "error") setEmailState("error");
    else if (s === "initial" || s === "done") setEmailState("initial");
  }, [state]);

  const sendCode = useCallback(
    async (email: string) => {
      setEmailState("sending-code");
      await privySendCode({ email });
    },
    [privySendCode],
  );

  const confirmCode = useCallback(
    async (code: string) => {
      setEmailState("submitting-code");
      await loginWithCode({ code });
    },
    [loginWithCode],
  );

  const logout = useCallback(async () => {
    registerEmbeddedSigner(null);
    await privyLogout();
  }, [privyLogout]);

  const exportWallet = useCallback(async () => {
    await privyExport();
  }, [privyExport]);


  // Memoize so consumers (AuthGate wraps the whole app) only re-render when a
  // value actually changes — not on every Privy store tick.
  return useMemo(
    () => ({
      session,
      loading: !ready,
      provisioning,
      emailState,
      sendCode,
      confirmCode,
      logout,
      exportWallet,
    }),
    [
      session,
      ready,
      provisioning,
      emailState,
      sendCode,
      confirmCode,
      logout,
      exportWallet,
    ],
  );
}
