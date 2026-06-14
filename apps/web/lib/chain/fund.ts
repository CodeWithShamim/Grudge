import { isStudionet } from "@/lib/auth/env";

/**
 * Studio-style auto-funding. sim_fundAccount mints SIMULATED GEN and is a
 * Studio-only RPC — it must NEVER run against Bradbury (real testnet funds).
 * Both an env guard and the RPC's own rejection enforce that, and
 * assertNoFundOnBradbury() is a build/runtime tripwire for misconfiguration.
 */

// 1000 GEN in wei. sim_fundAccount wants the amount as a JSON NUMBER, not a
// string (the RPC compares it with `<=` against an int and rejects strings).
// This value exceeds Number.MAX_SAFE_INTEGER, so it must be emitted as a raw
// numeric literal in the JSON body — never via Number()/JSON.stringify, which
// would lose precision or write it in scientific notation.
const FUND_AMOUNT_WEI = (1000n * 10n ** 18n).toString(); // digits only, no quotes

// Fund only when the balance is below this (≈ enough for a few writes). Dust is
// treated as empty so a near-zero account still gets topped up once.
const MIN_BALANCE_WEI = 1n * 10n ** 18n; // 1 GEN

/** Throws if a build somehow tries to fund on Bradbury — defence in depth. */
export function assertNoFundOnBradbury(): void {
  if (!isStudionet()) {
    throw new Error("sim_fundAccount is forbidden on Bradbury — it spends real testnet GEN.");
  }
}

/** Read the account's native GEN balance (wei) via the Studio RPC. */
async function getBalanceWei(rpc: string, address: `0x${string}`): Promise<bigint | null> {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const json = (await res.json()) as { result?: string; error?: unknown };
    if (json.error || typeof json.result !== "string") return null;
    return BigInt(json.result); // hex → bigint
  } catch {
    return null;
  }
}

/**
 * Ensure the embedded wallet has simulated GEN on studionet — but ONLY when its
 * balance is at/near zero. No-op on Bradbury (faucet shown instead) and no-op
 * when the account already holds GEN, so we don't re-fund on every login.
 *
 * Returns true only when a fund actually happened (so the "Test GEN ready"
 * toast fires once, not every time).
 */
export async function ensureFunded(address: `0x${string}`): Promise<boolean> {
  if (!isStudionet()) return false; // Bradbury: never auto-fund

  const rpc = process.env.NEXT_PUBLIC_STUDIO_RPC;
  if (!rpc) return false;

  assertNoFundOnBradbury();

  // Skip funding if the account already has a usable balance.
  const balance = await getBalanceWei(rpc, address);
  if (balance !== null && balance >= MIN_BALANCE_WEI) return false;

  try {
    // Hand-built body so the wei amount is a bare numeric literal (a big
    // integer JSON number), not a quoted string. address is wallet-derived
    // hex (already validated as `0x${string}`), so it's safe to interpolate.
    const body = `{"jsonrpc":"2.0","method":"sim_fundAccount","params":["${address}",${FUND_AMOUNT_WEI}],"id":1}`;
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = (await res.json()) as { error?: unknown };
    return !json.error;
  } catch {
    return false;
  }
}
