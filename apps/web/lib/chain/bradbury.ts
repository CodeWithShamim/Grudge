import { defineChain } from "viem";
import { z } from "zod";

/**
 * GenLayer Testnet Bradbury as a custom viem chain.
 *
 * All parameters come from env — NEVER hardcoded. Source them from
 * `genlayer network info` or ~/.genlayer/genlayer-config.json and put them
 * in apps/web/.env.local (see .env.example).
 */

const EnvSchema = z.object({
  chainId: z.coerce.number().int().positive(),
  rpc: z.string().url(),
  explorer: z.string().url(),
});

export function getBradburyEnv(): z.infer<typeof EnvSchema> | null {
  const parsed = EnvSchema.safeParse({
    chainId: process.env.NEXT_PUBLIC_BRADBURY_CHAIN_ID,
    rpc: process.env.NEXT_PUBLIC_BRADBURY_RPC,
    explorer: process.env.NEXT_PUBLIC_BRADBURY_EXPLORER,
  });
  return parsed.success ? parsed.data : null;
}

export function defineBradbury() {
  const env = getBradburyEnv();
  if (!env) {
    throw new Error(
      "Bradbury env missing. Set NEXT_PUBLIC_BRADBURY_CHAIN_ID, NEXT_PUBLIC_BRADBURY_RPC and NEXT_PUBLIC_BRADBURY_EXPLORER (see `genlayer network info`).",
    );
  }
  return defineChain({
    id: env.chainId,
    name: "GenLayer Testnet Bradbury",
    nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
    rpcUrls: { default: { http: [env.rpc] } },
    blockExplorers: { default: { name: "GenLayer Explorer", url: env.explorer } },
    testnet: true,
  });
}

export function explorerTxUrl(txHash: string): string {
  const env = getBradburyEnv();
  return env ? `${env.explorer.replace(/\/$/, "")}/tx/${txHash}` : "#";
}
