import { z } from "zod";

/**
 * Auth/network env, validated at boot.
 *
 * NEXT_PUBLIC_NETWORK selects studionet (auto-fund, simulated GEN) vs bradbury
 * (real testnet GEN, faucet, value-action confirm). This is SEPARATE from the
 * existing NEXT_PUBLIC_CHAIN_MODE (mock | genlayer), which gates whether the
 * app talks to a real chain at all.
 */
const AuthEnvSchema = z.object({
  privyAppId: z.string().min(1, "NEXT_PUBLIC_PRIVY_APP_ID is required"),
  network: z.enum(["studionet", "bradbury"]).default("studionet"),
  studioRpc: z.string().url().optional(),
});

export type AuthEnv = z.infer<typeof AuthEnvSchema>;

// Env is static for the process lifetime, so parse once and cache. Avoids
// re-running Zod on every render of AuthProviders / call site.
let cachedEnv: AuthEnv | null | undefined;

export function getAuthEnv(): AuthEnv | null {
  if (cachedEnv !== undefined) return cachedEnv;
  const parsed = AuthEnvSchema.safeParse({
    privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    network: process.env.NEXT_PUBLIC_NETWORK,
    studioRpc: process.env.NEXT_PUBLIC_STUDIO_RPC,
  });
  cachedEnv = parsed.success ? parsed.data : null;
  return cachedEnv;
}

export function isStudionet(): boolean {
  return (process.env.NEXT_PUBLIC_NETWORK ?? "studionet") === "studionet";
}
