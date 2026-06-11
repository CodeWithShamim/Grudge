/**
 * Maps raw contract/RPC error strings to user-friendly messages.
 * Patterns are tested in order — first match wins. The contract-side
 * patterns mirror the exact UserError strings in contracts/grudge.py.
 */

interface ErrorMapping {
  pattern: RegExp;
  message: string;
}

const CONTRACT_ERRORS: ErrorMapping[] = [
  // ── challenge lifecycle ───────────────────────────────────────────────
  { pattern: /challenge not found/i, message: "This grudge doesn't exist on-chain." },
  { pattern: /challenge is closed/i, message: "This grudge is closed — no more moves on it." },
  { pattern: /already settled/i, message: "This grudge has already been settled." },
  { pattern: /deadline has not passed/i, message: "The deadline hasn't hit yet — settling opens then." },
  { pattern: /deadline passed/i, message: "The deadline has passed — the only move left is to settle." },

  // ── creation ──────────────────────────────────────────────────────────
  { pattern: /self-stake required/i, message: "Put GEN where your mouth is — a self-stake is required." },
  { pattern: /duration must be/i, message: "Duration must be between 1 and 365 days." },
  { pattern: /required_proofs must be/i, message: "Required proofs must be between 1 and the number of days." },
  { pattern: /statement must be/i, message: "The promise must be 12–280 characters." },
  { pattern: /evidence_policy must be/i, message: "The evidence policy must be 4–280 characters." },
  { pattern: /category must be/i, message: "Category is too long (max 32 characters)." },
  { pattern: /statement rejected/i, message: "The validators rejected this promise — make it concrete, time-boxed, and verifiable." },

  // ── staking ───────────────────────────────────────────────────────────
  { pattern: /stake amount required/i, message: "Add a GEN amount to stake." },
  { pattern: /side must be/i, message: "Pick a side: believe or doubt." },
  { pattern: /creator cannot doubt themselves/i, message: "You can't doubt your own promise — that's just quitting." },
  { pattern: /staking window closed/i, message: "The staking window has closed for this grudge." },

  // ── evidence & disputes ───────────────────────────────────────────────
  { pattern: /only the challenger submits evidence/i, message: "Only the challenger can submit evidence." },
  { pattern: /evidence must be/i, message: "Evidence must be 4–4000 characters." },
  { pattern: /evidence already submitted/i, message: "Already submitted for this proof period — come back next period." },
  { pattern: /creator cannot dispute/i, message: "You can't dispute your own evidence." },
  { pattern: /no such evidence entry/i, message: "That evidence entry doesn't exist." },
  { pattern: /counter_evidence must be/i, message: "Counter-evidence must be 4–4000 characters." },
  { pattern: /only verified evidence can be disputed/i, message: "Only VERIFIED evidence can be disputed." },
  { pattern: /already disputed/i, message: "This evidence has already been disputed." },

  // ── claims ────────────────────────────────────────────────────────────
  { pattern: /nothing to claim/i, message: "Nothing to claim for this wallet." },

  // ── wallet / network ──────────────────────────────────────────────────
  { pattern: /no wallet (connected|available)/i, message: "Connect your wallet to continue." },
  { pattern: /user rejected|rejected by user|user denied/i, message: "Transaction cancelled." },
  { pattern: /insufficient funds/i, message: "Insufficient GEN balance — top up from the Bradbury faucet." },
  { pattern: /rate limit|429|too many requests/i, message: "The RPC is rate-limiting — wait a moment and try again." },
  { pattern: /switch your wallet/i, message: "Switch your wallet to GenLayer Testnet Bradbury to continue." },
  { pattern: /network|fetch|Failed to fetch|ECONNREFUSED|timeout/i, message: "Network error — check your connection and try again." },
];

const FALLBACK = "Something went wrong. Please try again.";

/**
 * Extracts the deepest human-readable string from any error shape thrown
 * by genlayer-js, viem, or the contract VM (UserError nests in cause/details).
 */
export function extractRawMessage(err: unknown): string {
  if (!err) return FALLBACK;

  const e = err as Record<string, unknown>;
  const cause = e.cause as Record<string, unknown> | undefined;
  const candidates = [e.details, e.shortMessage, cause?.message, cause?.details, e.message].filter(
    Boolean,
  ) as string[];

  // The actual UserError string is usually inside a quoted block
  for (const raw of candidates) {
    const m = String(raw).match(/UserError[^:]*:\s*(.+?)(?:\n|$)/);
    if (m?.[1]) return m[1].trim();
  }

  return candidates[0] ? String(candidates[0]) : FALLBACK;
}

/** Returns a user-friendly message for any contract/wallet error. */
export function friendlyError(err: unknown): string {
  const raw = extractRawMessage(err);

  for (const { pattern, message } of CONTRACT_ERRORS) {
    if (pattern.test(raw)) return message;
  }

  // Trim noisy viem prefixes before falling back
  const cleaned = raw
    .replace(/^(ContractFunctionExecutionError|ContractFunctionRevertedError|Error):\s*/i, "")
    .replace(/\n.*/s, "")
    .trim();

  return cleaned || FALLBACK;
}
