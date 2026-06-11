import type {
  Challenge,
  CreateChallengeInput,
  EvidenceEntry,
  Leaderboards,
  Profile,
  Screening,
  SettleResult,
  Side,
  TxResult,
} from "./types";

/**
 * THE contract adapter interface. Every chain access in the app goes through
 * a GrudgeClient — components and hooks never touch viem/genlayer-js directly.
 *
 * Implementations:
 *  - mock.ts      in-memory, zero-config, pixel-identical UI behavior
 *  - genlayer.ts  genlayer-js against Testnet Bradbury via the wagmi wallet
 */
export interface GrudgeClient {
  readonly mode: "mock" | "genlayer";

  getChallenge(id: string): Promise<Challenge>;
  getOpenChallenges(): Promise<Challenge[]>;

  /** Pre-flight LLM screening shown inline in the create wizard. */
  screenStatement(statement: string): Promise<Screening>;
  createChallenge(input: CreateChallengeInput, from: string): Promise<{ id: string; txHash: string }>;

  stake(id: string, side: Side, amount: number, from: string, taunt?: string): Promise<TxResult>;

  submitEvidence(id: string, evidenceText: string, from: string): Promise<{ txHash: string; entry: EvidenceEntry }>;
  disputeEvidence(
    id: string,
    evidenceIndex: number,
    counterEvidence: string,
    from: string,
  ): Promise<{ txHash: string; entry: EvidenceEntry }>;

  settle(id: string): Promise<SettleResult>;

  /** Winnings credited by settle() and not yet withdrawn, in GEN. */
  getClaimable(address: string): Promise<number>;
  /** Withdraw the caller's settled winnings. Rejects when nothing is claimable. */
  claim(from: string): Promise<{ txHash: string; amount: number }>;

  getProfile(address: string): Promise<Profile>;
  getLeaderboards(): Promise<Leaderboards>;
}

export type ChainMode = "mock" | "genlayer";

export function getChainMode(): ChainMode {
  return process.env.NEXT_PUBLIC_CHAIN_MODE === "genlayer" ? "genlayer" : "mock";
}

let singleton: GrudgeClient | null = null;

/**
 * The ONLY place a GrudgeClient is constructed. Mock by default so
 * `pnpm i && pnpm dev` boots with zero config.
 */
export async function getGrudgeClient(): Promise<GrudgeClient> {
  if (singleton) return singleton;
  if (getChainMode() === "genlayer") {
    const { createGenLayerGrudgeClient } = await import("./genlayer");
    singleton = createGenLayerGrudgeClient();
  } else {
    const { createMockGrudgeClient } = await import("./mock");
    singleton = createMockGrudgeClient();
  }
  return singleton;
}
