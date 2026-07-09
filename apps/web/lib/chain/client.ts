import type {
  AnchorInfo,
  Challenge,
  CreateChallengeInput,
  EvidenceEntry,
  Leaderboards,
  Profile,
  Reputation,
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
 *  - genlayer.ts  genlayer-js against GenLayer via the Privy embedded wallet
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
  /** F1: appeal a REJECTED verdict with a bond (GEN). */
  appealVerdict(
    id: string,
    evidenceIndex: number,
    bond: number,
  ): Promise<{ txHash: string; entry: EvidenceEntry }>;

  /** F5: the ownership code + status for a challenge's proof anchor. */
  getAnchorInfo(id: string): Promise<AnchorInfo>;
  /** F5: consensus-verify the registered proof anchor (creator only). */
  verifyAnchor(id: string, from: string): Promise<TxResult>;

  settle(id: string): Promise<SettleResult>;

  /** Winnings credited by settle() and not yet withdrawn, in GEN. */
  getClaimable(address: string): Promise<number>;
  /** Withdraw the caller's settled winnings. Rejects when nothing is claimable. */
  claim(from: string): Promise<{ txHash: string; amount: number }>;

  getProfile(address: string): Promise<Profile>;
  getLeaderboards(): Promise<Leaderboards>;
  /** F4: on-chain conviction rating for an address. */
  getReputation(address: string): Promise<Reputation>;
  /** F3: the referee's reasoning for an existing verdict (does not re-judge). */
  explainVerdict(id: string, evidenceIndex: number): Promise<{ verdict: string; explanation: string }>;
  /** F2: AI-designed evidence policy for a statement (preview, creates nothing). */
  suggestPolicy(statement: string): Promise<{ policy: string; rationale: string }>;
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
