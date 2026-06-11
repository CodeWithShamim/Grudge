"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount } from "wagmi";
import { useState, type Context, type ReactNode } from "react";
import { defineBradbury } from "./bradbury";
import { registerWagmiConfig } from "./wagmiBridge";

/**
 * The RainbowKit/wagmi provider stack, mounted ONLY when
 * NEXT_PUBLIC_CHAIN_MODE=genlayer. Separated so mock mode never ships
 * wallet JS.
 */

function buildConfig() {
  const bradbury = defineBradbury();
  // `||` (not `??`): an empty-string env var must also fall through. The
  // placeholder keeps RainbowKit happy; injected wallets (MetaMask) work
  // without a real WalletConnect Cloud id — only WC-relay wallets need one.
  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";
  const config = getDefaultConfig({
    appName: "GRUDGE",
    projectId,
    chains: [bradbury],
    ssr: false,
  });
  // expose the config so the genlayer-js adapter signs via the active connector
  registerWagmiConfig(config);
  return config;
}

function AddressBridge({
  ctx,
  children,
}: {
  ctx: Context<string | null>;
  children: ReactNode;
}) {
  const { address } = useAccount();
  return <ctx.Provider value={address ?? null}>{children}</ctx.Provider>;
}

export function GenLayerProviders({
  ctx,
  children,
}: {
  ctx: Context<string | null>;
  children: ReactNode;
}) {
  const [config] = useState(buildConfig);
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } }));
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#ffc24b", accentColorForeground: "#101216" })}
          modalSize="compact"
        >
          <AddressBridge ctx={ctx}>{children}</AddressBridge>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
