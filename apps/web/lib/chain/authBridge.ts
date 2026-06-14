/**
 * Bridge between the Privy React provider tree and the genlayer-js adapter
 * (plain TS, no React imports). The auth layer registers the embedded wallet's
 * raw EIP-1193 provider + address here once the user is authenticated; the
 * adapter passes the provider straight to genlayer-js, which sends writes as
 * standard EVM txs to the consensus contract — signed silently, no popup.
 *
 * (Same module-level-registry shape as the old wallet bridge, Privy source.)
 */

/** Minimal EIP-1193 provider surface genlayer-js needs. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

interface EmbeddedSigner {
  address: `0x${string}`;
  provider: Eip1193Provider;
}

let signer: EmbeddedSigner | null = null;

export function registerEmbeddedSigner(s: EmbeddedSigner | null): void {
  signer = s;
}

export function getEmbeddedSigner(): EmbeddedSigner | null {
  return signer;
}
