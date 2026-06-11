import type { Config } from "wagmi";

/**
 * Bridge between the RainbowKit/wagmi provider tree (React) and the
 * genlayer-js adapter (plain TS). GenLayerProviders registers its wagmi
 * config here; the adapter pulls the ACTIVE connector's EIP-1193 provider
 * from it so every write signs through the wallet the user actually
 * connected (injected, WalletConnect, Coinbase, …) — never a blind
 * `window.ethereum` grab.
 */

let wagmiConfig: Config | null = null;

export function registerWagmiConfig(config: Config): void {
  wagmiConfig = config;
}

export function getWagmiConfig(): Config | null {
  return wagmiConfig;
}
