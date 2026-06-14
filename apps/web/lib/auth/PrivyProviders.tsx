"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getAuthEnv } from "./env";
import { defineBradbury } from "@/lib/chain/bradbury";

/**
 * Privy + TanStack Query provider stack — replaces the old wagmi/RainbowKit
 * tree. Email-only login; every user gets an embedded wallet on first login so
 * writes sign silently. Themed to the GRUDGE betting-slip palette.
 *
 * Invariant: this either mounts a real <PrivyProvider> around `children`, or
 * it renders a config-error screen INSTEAD of `children`. So any component
 * that calls useAuth() is always under a PrivyProvider — useAuth can call
 * Privy hooks unconditionally (no rules-of-hooks branch).
 */
export function AuthProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } }));
  const env = getAuthEnv();

  // Stable config object (computed once) — a fresh config identity on every
  // render makes PrivyProvider re-initialize, which thrashes the whole tree.
  const [privyConfig] = useState(() => {
    const genlayerChain = defineBradbury();
    return {
      loginMethods: ["email"],
      embeddedWallets: {
        ethereum: { createOnLogin: "all-users" },
        showWalletUIs: false,
      },
      defaultChain: genlayerChain,
      supportedChains: [genlayerChain],
      appearance: { theme: "dark", accentColor: "#ffc24b" },
    } satisfies import("@privy-io/react-auth").PrivyClientConfig;
  });

  // No Privy app id → render a config-error screen INSTEAD of children, so no
  // useAuth() consumer ever mounts without a PrivyProvider above it.
  if (!env) {
    return (
      <QueryClientProvider client={qc}>
        <div className="flex min-h-dvh items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-card border border-doubt/40 bg-ink-soft p-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-doubt">
              auth not configured
            </p>
            <p className="font-sans text-sm text-mut">
              Email login is disabled because{" "}
              <code className="text-paper">NEXT_PUBLIC_PRIVY_APP_ID</code> is missing. Set it in{" "}
              <code className="text-paper">.env.local</code> and restart the dev server.
            </p>
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  // defaultChain/supportedChains tell Privy about GenLayer studionet so the
  // embedded wallet can sign on chain 61999.
  return (
    <PrivyProvider appId={env.privyAppId} config={privyConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
