import { z } from "zod";
import type { GrudgeClient } from "./client";
import { getBradburyEnv } from "./bradbury";
import { friendlyError } from "./errors";
import { emitTxStatus } from "./txStatus";
import {
  ChallengeSchema,
  ReputationSchema,
  ScreeningSchema,
  type Challenge,
  type CreateChallengeInput,
  type EvidenceEntry,
  type Leaderboards,
  type Profile,
  type Reputation,
  type Screening,
  type SettleResult,
  type Side,
  type TxResult,
} from "./types";

/**
 * genlayer-js adapter against GenLayer (studionet / Bradbury).
 *
 * This is the ONLY file that touches genlayer-js. Writes sign through the
 * Privy EMBEDDED wallet's viem client (registered in authBridge) — the key is
 * custodied by Privy, so signing is silent (no MetaMask, no popup).
 */

const GEN_DECIMALS = 18n;
const ONE_GEN = 10n ** GEN_DECIMALS;

function toUnits(amount: number): bigint {
  // game amounts are whole-ish GEN; keep 2dp precision
  return (BigInt(Math.round(amount * 100)) * ONE_GEN) / 100n;
}
function fromUnits(value: bigint): number {
  return Number((value * 100n) / ONE_GEN) / 100;
}

function contractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS;
  const parsed = z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .safeParse(addr);
  if (!parsed.success) {
    throw new Error(
      "NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS missing/invalid. Run `make -C contracts deploy` and restart.",
    );
  }
  return parsed.data as `0x${string}`;
}

/** Raw JSON shape emitted by contracts/grudge.py `get_challenge`. */
const RawChallengeSchema = z.object({
  id: z.number(),
  creator: z.string(),
  statement: z.string(),
  evidence_policy: z.string(),
  category: z.string().default("general"),
  self_stake: z.string(),
  believer_pool: z.string(),
  doubter_pool: z.string(),
  stakes: z.array(
    z.object({
      address: z.string(),
      side: z.enum(["believe", "doubt"]),
      amount: z.string(),
      taunt: z.string().default(""),
      at: z.number(),
    }),
  ),
  starts_at: z.number(),
  ends_at: z.number(),
  required_proofs: z.number(),
  verified_count: z.number(),
  status: z.enum(["ACTIVE", "SUCCEEDED", "FAILED", "SETTLED"]),
  evidence: z.array(
    z.object({
      day: z.number(),
      summary: z.string(),
      verdict: z.enum(["VERIFIED", "SUSPICIOUS", "REJECTED"]),
      reason: z.string(),
      confidence: z.number(),
      disputed: z.boolean().default(false),
      appealed: z.boolean().default(false),
      appeal_bond: z.string().default("0"),
    }),
  ),
});

function adaptChallenge(raw: z.infer<typeof RawChallengeSchema>): Challenge {
  return ChallengeSchema.parse({
    id: String(raw.id),
    creator: raw.creator,
    statement: raw.statement,
    evidencePolicy: raw.evidence_policy,
    category: raw.category,
    selfStake: fromUnits(BigInt(raw.self_stake)),
    believerPool: fromUnits(BigInt(raw.believer_pool)),
    doubterPool: fromUnits(BigInt(raw.doubter_pool)),
    stakes: raw.stakes.map((s) => ({
      address: s.address,
      side: s.side,
      amount: fromUnits(BigInt(s.amount)),
      taunt: s.taunt || undefined,
      at: s.at * 1000,
    })),
    startsAt: raw.starts_at * 1000,
    endsAt: raw.ends_at * 1000,
    requiredProofs: raw.required_proofs,
    verifiedCount: raw.verified_count,
    status: raw.status,
    evidence: raw.evidence.map((e) => ({
      ...e,
      appealBond: fromUnits(BigInt(e.appeal_bond)),
    })),
  });
}

type GenLayerSdkClient = {
  readContract(args: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
  }): Promise<unknown>;
  writeContract(args: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
    value: bigint;
  }): Promise<unknown>;
  getTransaction(args: { hash: `0x${string}` }): Promise<unknown>;
};

async function buildChain(): Promise<Record<string, unknown>> {
  const env = getBradburyEnv();
  if (!env) {
    throw new Error("Bradbury env not configured — see apps/web/.env.example");
  }
  const chains = (await import("genlayer-js/chains")) as Record<
    string,
    unknown
  >;
  // Pick the published base chain that MATCHES the target id: each carries the
  // consensus contract address genlayer-js routes writes to. Using the wrong
  // base (e.g. testnetBradbury for a Studio id) sends the tx to Bradbury's
  // consensus contract on the Studio network and the write fails. studionet is
  // the right base for Studio (which is feeless — a 0-GEN network fee is
  // expected there, not an error).
  const STUDIO_CHAIN_ID = 61999;
  const baseKey =
    env.chainId === STUDIO_CHAIN_ID ? "studionet" : "testnetBradbury";
  const base = (chains[baseKey] ?? chains["studionet"] ?? {}) as Record<
    string,
    unknown
  >;
  return {
    ...base,
    id: env.chainId,
    name:
      baseKey === "studionet" ? "GenLayer Studio" : "GenLayer Testnet Bradbury",
    rpcUrls: { default: { http: [env.rpc] }, public: { http: [env.rpc] } },
    blockExplorers: {
      default: { name: "GenLayer Explorer", url: env.explorer },
    },
  };
}

/** Read client — talks straight to the GenLayer RPC; no wallet required. */
async function makeReadClient(): Promise<GenLayerSdkClient> {
  const { createClient } = await import("genlayer-js");
  const chain = await buildChain();
  const client = createClient({ chain } as unknown as Parameters<
    typeof createClient
  >[0]);
  return client as unknown as GenLayerSdkClient;
}

/**
 * Write client — signs through the Privy EMBEDDED wallet (key custodied by
 * Privy, no MetaMask, no popup). The auth layer registers the embedded viem
 * WalletClient into authBridge once the user is logged in; genlayer-js sends
 * the write as a standard EVM tx to the consensus contract through that
 * provider, signed silently.
 */
async function makeWriteClient(): Promise<GenLayerSdkClient> {
  const { getEmbeddedSigner } = await import("./authBridge");
  const signer = getEmbeddedSigner();
  if (!signer) {
    throw new Error("Sign in with your email to continue.");
  }

  const { createClient } = await import("genlayer-js");
  const chain = await buildChain();
  const client = createClient({
    chain,
    account: signer.address,
    provider: signer.provider,
  } as unknown as Parameters<typeof createClient>[0]);
  return client as unknown as GenLayerSdkClient;
}

let readPromise: Promise<GenLayerSdkClient> | null = null;
function readSdk(): Promise<GenLayerSdkClient> {
  readPromise ??= makeReadClient();
  return readPromise;
}

// ── read layer: cache + in-flight dedup + concurrency limit + backoff ──
// Bradbury rate-limits gen_call, so raw per-component reads cause 429 storms.
// (Pattern proven in production on the arbiq deployment.)

const readCache = new Map<string, { result: unknown; ts: number }>();
const READ_CACHE_TTL = 15_000; // ms

// Multiple components reading the same key at the same moment share ONE
// in-flight promise instead of each firing their own gen_call.
const inFlight = new Map<string, Promise<unknown>>();

// At most 2 simultaneous RPC reads.
const MAX_CONCURRENT = 2;
let active = 0;
const slotQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => slotQueue.push(resolve));
}

function releaseSlot(): void {
  const next = slotQueue.shift();
  if (next) next();
  else active--;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate limit|429|too many requests/i.test(msg);
}

// One concurrency slot is acquired and released exactly once per attempt.
async function fetchOnce(
  functionName: string,
  args: unknown[],
): Promise<unknown> {
  await acquireSlot();
  try {
    const client = await readSdk();
    return await client.readContract({
      address: contractAddress(),
      functionName,
      args,
    });
  } finally {
    releaseSlot();
  }
}

// Backoff happens OUTSIDE the slot so a rate-limited read doesn't hold a
// slot while it sleeps — that would starve the limiter and worsen the storm.
async function fetchWithRetry(
  functionName: string,
  args: unknown[],
  attempt = 0,
): Promise<unknown> {
  try {
    return await fetchOnce(functionName, args);
  } catch (err) {
    if (isRateLimit(err) && attempt < 5) {
      // 800ms, 1.6s, 3.2s, 6.4s, 12.8s + jitter to de-sync clients
      const delay = 800 * 2 ** attempt + Math.random() * 400;
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(functionName, args, attempt + 1);
    }
    throw err;
  }
}

async function readRaw(
  functionName: string,
  args: unknown[],
): Promise<unknown> {
  const key = functionName + JSON.stringify(args);

  const cached = readCache.get(key);
  if (cached && Date.now() - cached.ts < READ_CACHE_TTL) return cached.result;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetchWithRetry(functionName, args)
    .then((result) => {
      readCache.set(key, { result, ts: Date.now() });
      inFlight.delete(key);
      return result;
    })
    .catch((err: unknown) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

// No network-switch guard: the Privy embedded wallet is provisioned directly
// on the configured GenLayer chain, so there is nothing to switch.

// ── consensus wait ──────────────────────────────────────────────────────
// The SDK's waitForTransactionReceipt(status: "ACCEPTED") is unusable here:
// it resolves on ANY decided state — UNDETERMINED / CANCELED / *_TIMEOUT
// would be reported as success — and it throws "Transaction not found" when
// polled before the tx indexes. So we poll getTransaction ourselves (the
// pattern proven on the arbiq deployment) and fail loudly on bad outcomes.

const SUCCESS_STATES = new Set(["ACCEPTED", "FINALIZED"]);
const FAILURE_STATES = new Set([
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT",
]);

const POLL_INTERVAL = 2_000;
const DEFAULT_POLLS = 90; // ~3 min for deterministic ops
const AI_POLLS = 150; // ~5 min — LLM-judged ops take the full consensus window
const AI_WRITES = new Set([
  "create_challenge",
  "submit_evidence",
  "dispute_evidence",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** The (possibly array-wrapped) leader receipt of a transaction. */
function leaderReceipt(tx: unknown): Record<string, unknown> | undefined {
  const lr = (tx as { consensus_data?: { leader_receipt?: unknown } })
    ?.consensus_data?.leader_receipt;
  return (Array.isArray(lr) ? lr[0] : lr) as
    | Record<string, unknown>
    | undefined;
}

/**
 * Pull the contract's own error string out of a transaction receipt — the exact
 * "Error Message" the GenLayer explorer shows for a reverted tx (e.g. "creator
 * cannot doubt themselves").
 *
 * On Studio the SDK decodes the leader receipt's `result` into
 * `{ status: "rollback" | "contract_error", payload: "<message>" }` — the
 * payload IS the message (stdout/stderr are empty for a clean UserError). We
 * read that first, then fall back to stderr / wrapped forms for other runners.
 */
function leaderErrorDetail(tx: unknown): string {
  const r = leaderReceipt(tx);
  if (!r) return "";

  // Studio: decoded result object with the message in `payload`.
  const result = r.result as Record<string, unknown> | string | undefined;
  if (result && typeof result === "object") {
    const status = String(result.status ?? "");
    if (
      status === "rollback" ||
      status === "contract_error" ||
      status === "error"
    ) {
      const payload = result.payload;
      if (typeof payload === "string" && payload.trim())
        return cleanMessage(payload);
    }
  }

  // Other runners: stderr / error / a stringy result.
  const gv = r.genvm_result as Record<string, unknown> | undefined;
  const candidate =
    gv?.stderr ?? r.error ?? (typeof result === "string" ? result : "") ?? "";
  const text = String(candidate).trim();
  return text ? cleanMessage(text) : "";
}

/** Strip Python wrappers so "Rollback('msg')" / "UserError: msg" → "msg". */
function cleanMessage(text: string): string {
  const t = text.trim();
  const m =
    t.match(/UserError[^:]*:\s*(.+?)(?:\n|$)/) ??
    t.match(/Rollback\(["']?(.+?)["']?\)/) ??
    t.match(/Error:\s*(.+?)(?:\n|$)/);
  return (m?.[1] ?? t).trim().slice(0, 300);
}

/** Did the tx execute the contract but revert (vs. succeed)? */
function executionReverted(tx: unknown): boolean {
  const t = tx as {
    txExecutionResultName?: unknown;
    txExecutionResult?: unknown;
  };

  // Public-testnet path: the SDK computes the execution-result enum.
  const name =
    typeof t.txExecutionResultName === "string" ? t.txExecutionResultName : "";
  if (name) return name === "FINISHED_WITH_ERROR";
  if (t.txExecutionResult !== undefined)
    return Number(t.txExecutionResult) === 2;

  // Studio path: read the decoded leader receipt's result status directly.
  const r = leaderReceipt(tx);
  const result = r?.result as Record<string, unknown> | string | undefined;
  if (result && typeof result === "object") {
    const status = String(result.status ?? "").toLowerCase();
    // "return" is the only success status; everything else is a revert/error.
    if (status) return status !== "return" && status !== "none";
  }
  const er = String(r?.execution_result ?? "").toUpperCase();
  if (er)
    return (
      er.includes("ERROR") || er.includes("ROLLBACK") || er.includes("REVERT")
    );

  // Last resort: a non-empty extracted message means it reverted.
  return Boolean(leaderErrorDetail(tx));
}

async function waitForDecision(
  txHash: `0x${string}`,
  functionName: string,
  polls: number,
): Promise<void> {
  const { transactionsStatusNumberToName } = await import("genlayer-js/types");
  const statusNames = transactionsStatusNumberToName as Record<string, string>;
  const client = await readSdk();

  emitTxStatus({ txHash, functionName, status: "PENDING", done: false });
  // Grace period: getTransaction 404s right after submission — polling
  // immediately just burns attempts on guaranteed misses.
  await sleep(POLL_INTERVAL);

  let lastStatus = "PENDING";
  for (let i = 0; i < polls; i++) {
    let tx: unknown = null;
    try {
      tx = await client.getTransaction({ hash: txHash });
    } catch {
      // not indexed yet / transient RPC error — keep polling
    }

    if (tx) {
      // Bradbury reports status as a number-string; Studio may return the name.
      const raw = String((tx as { status?: unknown }).status ?? "");
      const status = statusNames[raw] ?? raw;

      if (status && status !== lastStatus) {
        lastStatus = status;
        emitTxStatus({ txHash, functionName, status, done: false });
      }
      if (SUCCESS_STATES.has(status)) {
        // Consensus decided — but the tx may have EXECUTED and reverted (the
        // contract raised a UserError). The explorer shows that message; so do
        // we, instead of falsely reporting success.
        if (executionReverted(tx)) {
          emitTxStatus({ txHash, functionName, status, done: true, ok: false });
          const detail = leaderErrorDetail(tx);
          throw new Error(detail || "The contract rejected this transaction.");
        }
        emitTxStatus({ txHash, functionName, status, done: true, ok: true });
        return;
      }
      if (FAILURE_STATES.has(status)) {
        emitTxStatus({ txHash, functionName, status, done: true, ok: false });
        const detail = leaderErrorDetail(tx);
        throw new Error(`Consensus ${status}${detail ? `: ${detail}` : ""}`);
      }
    }

    await sleep(POLL_INTERVAL);
  }

  emitTxStatus({
    txHash,
    functionName,
    status: lastStatus,
    done: true,
    ok: false,
  });
  throw new Error(
    `Timed out waiting for consensus on ${functionName} (tx ${txHash})`,
  );
}

// The write client is rebuilt per call: the connected account can change.
async function write(
  functionName: string,
  args: unknown[],
  value = 0n,
): Promise<TxResult> {
  try {
    const client = await makeWriteClient();

    const hash = await client.writeContract({
      address: contractAddress(),
      functionName,
      args,
      value,
    });
    const txHash = typeof hash === "string" ? hash : String(hash);
    const polls = AI_WRITES.has(functionName) ? AI_POLLS : DEFAULT_POLLS;
    await waitForDecision(txHash as `0x${string}`, functionName, polls);
    // State changed on-chain — stale cached reads would mask the write.
    readCache.clear();
    return { txHash };
  } catch (err) {
    throw new Error(friendlyError(err), { cause: err });
  }
}

async function readJson<S extends z.ZodTypeAny>(
  functionName: string,
  args: unknown[],
  schema: S,
): Promise<z.output<S>> {
  const raw = await readRaw(functionName, args);
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  return schema.parse(JSON.parse(text)) as z.output<S>;
}

const PAGE_LIMIT = 50;

/**
 * Bounded list projection emitted by the contract's get_challenges_page. It
 * carries NO nested stakes/evidence arrays (only counts) so a page's size is
 * fixed regardless of activity — full detail comes from get_challenge(id).
 */
const SummarySchema = z.object({
  id: z.number(),
  creator: z.string(),
  statement: z.string(),
  category: z.string().default("general"),
  self_stake: z.string(),
  believer_pool: z.string(),
  doubter_pool: z.string(),
  stake_count: z.number(),
  evidence_count: z.number(),
  starts_at: z.number(),
  ends_at: z.number(),
  required_proofs: z.number(),
  verified_count: z.number(),
  status: z.enum(["ACTIVE", "SUCCEEDED", "FAILED", "SETTLED"]),
});

const ChallengesPageSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  challenges: z.array(SummarySchema),
});

/**
 * Adapt a bounded summary to a Challenge with EMPTY stakes/evidence arrays.
 * List views (feed, hero ledger, leaderboards) only read pools/status/
 * statement; the detail page calls getChallenge(id) for the full object.
 */
function adaptSummary(raw: z.infer<typeof SummarySchema>): Challenge {
  return ChallengeSchema.parse({
    id: String(raw.id),
    creator: raw.creator,
    statement: raw.statement,
    evidencePolicy: "",
    category: raw.category,
    selfStake: fromUnits(BigInt(raw.self_stake)),
    believerPool: fromUnits(BigInt(raw.believer_pool)),
    doubterPool: fromUnits(BigInt(raw.doubter_pool)),
    stakes: [],
    startsAt: raw.starts_at * 1000,
    endsAt: raw.ends_at * 1000,
    requiredProofs: raw.required_proofs,
    verifiedCount: raw.verified_count,
    status: raw.status,
    evidence: [],
  });
}

/** Page through get_challenges_page so no single gen_call is unbounded. */
async function fetchAllPaged(): Promise<Challenge[]> {
  const out: Challenge[] = [];
  let offset = 0;
  for (;;) {
    const page = await readJson(
      "get_challenges_page",
      [offset, PAGE_LIMIT],
      ChallengesPageSchema,
    );
    out.push(...page.challenges.map(adaptSummary));
    offset += PAGE_LIMIT;
    if (page.challenges.length === 0 || out.length >= page.total) break;
  }
  return out;
}

export function createGenLayerGrudgeClient(): GrudgeClient {
  // get_challenges_page is the ONLY list read — the unbounded get_open_challenges
  // was removed from the contract (it would revert as the ledger grows).
  const getAll = async (): Promise<Challenge[]> => fetchAllPaged();

  return {
    mode: "genlayer",

    async getChallenge(id: string): Promise<Challenge> {
      const raw = await readJson(
        "get_challenge",
        [Number(id)],
        RawChallengeSchema,
      );
      return adaptChallenge(raw);
    },

    getOpenChallenges: getAll,

    async screenStatement(statement: string): Promise<Screening> {
      // Pre-flight screening uses the same judge proxy as mock mode; the
      // contract independently re-screens on create_challenge.
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "screen", statement }),
      });
      return ScreeningSchema.parse(await res.json());
    },

    async createChallenge(
      input: CreateChallengeInput,
    ): Promise<{ id: string; txHash: string }> {
      const { txHash } = await write(
        "create_challenge",
        [
          input.statement,
          input.evidencePolicy,
          input.category,
          input.durationDays,
          input.requiredProofs,
        ],
        toUnits(input.selfStake),
      );
      // Resolve the new id with the cheapest read available: ids are
      // sequential from 1, so the page total IS the newest id. Refetching the
      // whole ledger here doubled the perceived create time — the challenge
      // page reads get_challenge by id right after navigation anyway.
      const page = await readJson(
        "get_challenges_page",
        [0, 1],
        ChallengesPageSchema,
      );
      return { id: String(page.total), txHash };
    },

    async stake(
      id: string,
      side: Side,
      amount: number,
      _from: string,
      taunt?: string,
    ): Promise<TxResult> {
      return write("stake", [Number(id), side, taunt ?? ""], toUnits(amount));
    },

    async submitEvidence(
      id: string,
      evidenceText: string,
    ): Promise<{ txHash: string; entry: EvidenceEntry }> {
      const { txHash } = await write("submit_evidence", [
        Number(id),
        evidenceText,
      ]);
      const challenge = await this.getChallenge(id);
      const entry = challenge.evidence[challenge.evidence.length - 1];
      if (!entry)
        throw new Error(
          "Evidence was submitted but the verdict could not be read back.",
        );
      return { txHash, entry };
    },

    async disputeEvidence(
      id: string,
      evidenceIndex: number,
      counterEvidence: string,
    ) {
      const { txHash } = await write("dispute_evidence", [
        Number(id),
        evidenceIndex,
        counterEvidence,
      ]);
      const challenge = await this.getChallenge(id);
      const entry = challenge.evidence[evidenceIndex];
      if (!entry)
        throw new Error("Dispute landed but the entry could not be read back.");
      return { txHash, entry };
    },

    async appealVerdict(id: string, evidenceIndex: number, bond: number) {
      // F1: payable — the bond is sent as value with the appeal.
      const { txHash } = await write(
        "appeal_verdict",
        [Number(id), evidenceIndex],
        toUnits(bond),
      );
      const challenge = await this.getChallenge(id);
      const entry = challenge.evidence[evidenceIndex];
      if (!entry)
        throw new Error("Appeal landed but the entry could not be read back.");
      return { txHash, entry };
    },

    async settle(id: string): Promise<SettleResult> {
      const { txHash } = await write("settle", [Number(id)]);
      const c = await this.getChallenge(id);
      const succeeded = c.verifiedCount >= c.requiredProofs;
      return {
        txHash,
        outcome: succeeded ? "SUCCEEDED" : "FAILED",
        payouts: [],
        rake: 0,
      };
    },

    async getClaimable(address: string): Promise<number> {
      // get_claimable returns a bare integer string in wei-style units; parse
      // through BigInt (JSON.parse would lose precision past 2^53).
      const raw = await readRaw("get_claimable", [address]);
      return fromUnits(BigInt(String(raw).trim()));
    },

    async claim(_from: string): Promise<{ txHash: string; amount: number }> {
      // The wallet is the caller on-chain; read the amount first since the
      // contract zeroes the ledger before transferring.
      const amount = await this.getClaimable(_from);
      const { txHash } = await write("claim", []);
      return { txHash, amount };
    },

    async getProfile(address: string): Promise<Profile> {
      // Derived client-side from the challenge list (read-model; chain is truth).
      const all = await getAll();
      const mine = all.filter(
        (c) => c.creator.toLowerCase() === address.toLowerCase(),
      );
      const kept = mine.filter((c) => c.status === "SUCCEEDED").length;
      const broken = mine.filter(
        (c) =>
          c.status === "FAILED" ||
          (c.status === "SETTLED" && c.verifiedCount < c.requiredProofs),
      ).length;
      const receipts = all
        .filter(
          (c) => c.status !== "ACTIVE" && c.verifiedCount < c.requiredProofs,
        )
        .flatMap((c) =>
          c.stakes
            .filter(
              (s) =>
                s.side === "doubt" &&
                s.address.toLowerCase() === address.toLowerCase(),
            )
            .map((s) => ({
              challengeId: c.id,
              statement: c.statement,
              amount: s.amount,
              winnings: 0,
            })),
        );
      return {
        address,
        kept,
        broken,
        earnings: 0,
        calledItReceipts: receipts,
        currentStreak: mine
          .filter((c) => c.status === "ACTIVE")
          .reduce((m, c) => Math.max(m, c.verifiedCount), 0),
      };
    },

    async getLeaderboards(): Promise<Leaderboards> {
      const all = await getAll();
      return {
        mostUnbreakable: [],
        sharpestDoubters: [],
        biggestPots: all
          .map((c) => ({
            challengeId: c.id,
            statement: c.statement,
            pot: c.believerPool + c.doubterPool + c.selfStake,
          }))
          .sort((a, b) => b.pot - a.pot)
          .slice(0, 10),
      };
    },

    async getReputation(address: string): Promise<Reputation> {
      // F4: get_reputation returns a bounded, fixed-size snake_case object.
      const raw = await readJson("get_reputation", [address], RawReputationSchema);
      return adaptReputation(raw);
    },

    async explainVerdict(id: string, evidenceIndex: number) {
      // F3: read-only consensus view — never re-judges. Bounded to 600 chars.
      return readJson("explain_verdict", [Number(id), evidenceIndex], ExplainSchema);
    },

    async suggestPolicy(statement: string) {
      // F2: read-only consensus — designs a policy, creates nothing.
      return readJson("suggest_evidence_policy", [statement], SuggestSchema);
    },
  };
}

/** F3 explain_verdict output. */
const ExplainSchema = z.object({
  verdict: z.string(),
  explanation: z.string().max(600),
});

/** F2 suggest_evidence_policy output. */
const SuggestSchema = z.object({
  policy: z.string().max(280),
  rationale: z.string().max(280),
});

/** Raw snake_case shape from contracts/grudge.py get_reputation. */
const RawReputationSchema = z.object({
  address: z.string(),
  challenges_created: z.number(),
  challenges_won: z.number(),
  proofs_verified: z.number(),
  proofs_rejected: z.number(),
  doubts_made: z.number(),
  doubts_correct: z.number(),
  conviction_score: z.number(),
  doubter_accuracy: z.number(),
});

function adaptReputation(raw: z.infer<typeof RawReputationSchema>): Reputation {
  return ReputationSchema.parse({
    address: raw.address,
    challengesCreated: raw.challenges_created,
    challengesWon: raw.challenges_won,
    proofsVerified: raw.proofs_verified,
    proofsRejected: raw.proofs_rejected,
    doubtsMade: raw.doubts_made,
    doubtsCorrect: raw.doubts_correct,
    convictionScore: raw.conviction_score,
    doubterAccuracy: raw.doubter_accuracy,
  });
}
