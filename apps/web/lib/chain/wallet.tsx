"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getChainMode } from "./client";

/**
 * Wallet + query providers.
 *
 * Mock mode mounts only TanStack Query — no wallet libs on the critical
 * path, so `pnpm dev` boots with zero config. GenLayer mode lazily mounts
 * RainbowKit/wagmi configured for Testnet Bradbury (env-driven, see
 * bradbury.ts) with a wrong-network guard and faucet prompt.
 */

const WalletAddressContext = createContext<string | null>(null);

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

import dynamic from "next/dynamic";

// Wallet stack is code-split off the critical path; only loaded in genlayer mode.
const GenLayerProviders = dynamic(() => import("./walletGenlayer").then((m) => m.GenLayerProviders), {
  ssr: false,
});

export function ChainProviders({ children }: { children: ReactNode }) {
  const mode = useMemo(() => getChainMode(), []);
  if (mode === "genlayer") {
    return <GenLayerProviders ctx={WalletAddressContext}>{children}</GenLayerProviders>;
  }
  return <MockProviders>{children}</MockProviders>;
}
