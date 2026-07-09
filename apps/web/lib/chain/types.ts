import { z } from "zod";

/**
 * Domain types for GRUDGE, shared by every chain mode.
 *
 * The contract returns JSON strings; everything that crosses the chain
 * boundary is parsed with these Zod schemas so malformed payloads fail
 * loudly and gracefully (never `as`).
 *
 * Amounts are whole GEN units (the game currency), kept as numbers in the
 * UI domain; the genlayer adapter converts to/from wei-style bigints.
 */

/**
 * Minimum stake / self-stake in GEN. Enforced in the UI and the mock chain;
 * the deployed contract accepts any non-zero value, so this can be tuned
 * client-side without redeploying.
 */
export const MIN_STAKE_GEN = 0.1;

export const SideSchema = z.enum(["believe", "doubt"]);
export type Side = z.infer<typeof SideSchema>;

export const ChallengeStatusSchema = z.enum(["ACTIVE", "SUCCEEDED", "FAILED", "SETTLED"]);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

export const VerdictSchema = z.enum(["VERIFIED", "SUSPICIOUS", "REJECTED"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const EvidenceEntrySchema = z.object({
  day: z.number().int().nonnegative(),
  summary: z.string(),
  verdict: VerdictSchema,
  reason: z.string(),
  confidence: z.number().int().min(0).max(100),
  disputed: z.boolean().default(false),
  // F1 appeals
  appealed: z.boolean().default(false),
  appealBond: z.number().nonnegative().default(0),
  txHash: z.string().optional(),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;

export const StakeEntrySchema = z.object({
  address: z.string(),
  side: SideSchema,
  amount: z.number().positive(),
  taunt: z.string().optional(),
  at: z.number(),
});
export type StakeEntry = z.infer<typeof StakeEntrySchema>;

export const ChallengeSchema = z.object({
  id: z.string(),
  creator: z.string(),
  statement: z.string(),
  evidencePolicy: z.string(),
  category: z.string().default("general"),
  selfStake: z.number().nonnegative(),
  believerPool: z.number().nonnegative(),
  doubterPool: z.number().nonnegative(),
  stakes: z.array(StakeEntrySchema),
  startsAt: z.number(),
  endsAt: z.number(),
  requiredProofs: z.number().int().positive(),
  verifiedCount: z.number().int().nonnegative(),
  status: ChallengeStatusSchema,
  evidence: z.array(EvidenceEntrySchema),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

export const ScreeningSchema = z.object({
  accepted: z.boolean(),
  reason: z.string(),
  suggestedRewrite: z.string().optional(),
});
export type Screening = z.infer<typeof ScreeningSchema>;

export const JudgeResultSchema = z.object({
  verdict: VerdictSchema,
  reason: z.string(),
  confidence: z.number().int().min(0).max(100),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;

export const TxResultSchema = z.object({
  txHash: z.string(),
});
export type TxResult = z.infer<typeof TxResultSchema>;

export const SettleResultSchema = z.object({
  txHash: z.string(),
  outcome: z.enum(["SUCCEEDED", "FAILED"]),
  payouts: z.array(z.object({ address: z.string(), amount: z.number() })),
  rake: z.number(),
});
export type SettleResult = z.infer<typeof SettleResultSchema>;

export const ProfileSchema = z.object({
  address: z.string(),
  kept: z.number().int().nonnegative(),
  broken: z.number().int().nonnegative(),
  earnings: z.number(),
  calledItReceipts: z.array(
    z.object({
      challengeId: z.string(),
      statement: z.string(),
      amount: z.number(),
      winnings: z.number(),
    }),
  ),
  currentStreak: z.number().int().nonnegative(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * F4 conviction rating — the contract's get_reputation JSON. Raw counters plus
 * two deterministic 0-100 derived scores. All fields are display values; never
 * trust them for authorization (chain is truth).
 */
export const ReputationSchema = z.object({
  address: z.string(),
  challengesCreated: z.number().int().nonnegative(),
  challengesWon: z.number().int().nonnegative(),
  proofsVerified: z.number().int().nonnegative(),
  proofsRejected: z.number().int().nonnegative(),
  doubtsMade: z.number().int().nonnegative(),
  doubtsCorrect: z.number().int().nonnegative(),
  convictionScore: z.number().int().min(0).max(100),
  doubterAccuracy: z.number().int().min(0).max(100),
});
export type Reputation = z.infer<typeof ReputationSchema>;

export const LeaderboardsSchema = z.object({
  mostUnbreakable: z.array(z.object({ address: z.string(), kept: z.number(), broken: z.number() })),
  sharpestDoubters: z.array(z.object({ address: z.string(), roi: z.number(), staked: z.number() })),
  biggestPots: z.array(z.object({ challengeId: z.string(), statement: z.string(), pot: z.number() })),
});
export type Leaderboards = z.infer<typeof LeaderboardsSchema>;

/** Validator vote shown during the "Validators voting…" sequence. */
export interface ValidatorVote {
  validator: string;
  verdict: Verdict;
}

export interface CreateChallengeInput {
  statement: string;
  evidencePolicy: string;
  category: string;
  durationDays: number;
  requiredProofs: number;
  selfStake: number;
}
