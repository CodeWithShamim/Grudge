"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { getChainMode } from "./client";

/**
 * Auth + query providers.
 *
 * Mock mode mounts only TanStack Query — no auth libs on the critical path, so
 * `pnpm dev` boots with zero config. GenLayer mode mounts the Privy stack
 * (email login + embedded wallet) instead of the old wagmi/RainbowKit tree.
 *
 * The public surface (`ChainProviders`, `useWalletAddress`) is unchanged so
 * the rest of the app keeps consuming the connected address the same way.
 */

export const WalletAddressContext = createContext<string | null>(null);

export function useWalletAddress(): string | null {
  return useContext(WalletAddressContext);
}

function MockProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } }));
  return (
    <QueryClientProvider client={qc}>
      <WalletAddressContext.Provider value={null}>{children}</WalletAddressContext.Provider>
    </QueryClientProvider>
  );
}

// Privy stack + session bridge are code-split off the critical path; only
// loaded in genlayer mode so mock mode ships no auth JS.
const AuthProviders = dynamic(() => import("@/lib/auth/PrivyProviders").then((m) => m.AuthProviders), {
  ssr: false,
});
const SessionAddressBridge = dynamic(
  () => import("@/lib/auth/SessionAddressBridge").then((m) => m.SessionAddressBridge),
  { ssr: false },
);

export function ChainProviders({ children }: { children: ReactNode }) {
  const mode = useMemo(() => getChainMode(), []);
  if (mode === "genlayer") {
    return (
      <AuthProviders>
        <SessionAddressBridge>{children}</SessionAddressBridge>
      </AuthProviders>
    );
  }
  return <MockProviders>{children}</MockProviders>;
}
