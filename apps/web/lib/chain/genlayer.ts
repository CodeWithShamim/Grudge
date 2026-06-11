import { z } from "zod";
import type { GrudgeClient } from "./client";
import { getBradburyEnv } from "./bradbury";
import {
  ChallengeSchema,
  ScreeningSchema,
  type Challenge,
  type CreateChallengeInput,
  type EvidenceEntry,
  type Leaderboards,
  type Profile,
  type Screening,
  type SettleResult,
  type Side,
  type TxResult,
} from "./types";

/**
 * genlayer-js adapter against Testnet Bradbury.
 *
 * This is the ONLY file that touches genlayer-js. The wallet account comes
 * from the injected EIP-1193 provider that RainbowKit/wagmi connected —
 * keys never leave the wallet; genlayer-js signs through the provider.
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
    evidence: raw.evidence,
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
  waitForTransactionReceipt(args: { hash: `0x${string}`; status?: string; retries?: number }): Promise<unknown>;
};

async function buildChain(): Promise<Record<string, unknown>> {
  const env = getBradburyEnv();
  if (!env) {
    throw new Error("Bradbury env not configured — see apps/web/.env.example");
  }
  const chains = await import("genlayer-js/chains");
  // Start from the published testnetBradbury chain object, overridden with
  // env so nothing is hardcoded (chain id / RPC / explorer follow resets).
  const base = (chains as Record<string, unknown>)["testnetBradbury"] ?? {};
  return {
    ...(base as Record<string, unknown>),
    id: env.chainId,
    name: "GenLayer Testnet Bradbury",
    rpcUrls: { default: { http: [env.rpc] } },
    blockExplorers: { default: { name: "GenLayer Explorer", url: env.explorer } },
    nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
    testnet: true,
  };
}

/** Read client — talks straight to the GenLayer RPC; no wallet required. */
async function makeReadClient(): Promise<GenLayerSdkClient> {
  const { createClient } = await import("genlayer-js");
  const chain = await buildChain();
  const client = createClient({ chain } as unknown as Parameters<typeof createClient>[0]);
  return client as unknown as GenLayerSdkClient;
}

type Eip1193Provider = { request(args: { method: string; params?: unknown }): Promise<unknown> };

/**
 * Write client — signs through the ACTIVE RainbowKit/wagmi connector.
 * Every writeTx resolves the connected account + its EIP-1193 provider from
 * the wagmi config (works for injected, WalletConnect, Coinbase, …);
 * `window.ethereum` is only a last-resort fallback.
 */
async function makeWriteClient(): Promise<GenLayerSdkClient> {
  let account: string | undefined;
  let provider: Eip1193Provider | undefined;

  const { getWagmiConfig } = await import("./wagmiBridge");
  const config = getWagmiConfig();
  if (config) {
    const { getAccount } = await import("wagmi/actions");
    const current = getAccount(config);
    if (!current.isConnected || !current.address || !current.connector) {
      throw new Error("No wallet connected. Use Connect Wallet in the header first.");
    }
    account = current.address;
    provider = (await current.connector.getProvider()) as Eip1193Provider;
  } else {
    // mock->genlayer edge cases / tests: fall back to the injected provider
    const eth = (globalThis as { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) throw new Error("No wallet available. Connect a wallet first.");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    account = accounts[0];
    provider = eth;
  }
  if (!account || !provider) throw new Error("Wallet returned no account. Connect a wallet first.");

  const { createClient } = await import("genlayer-js");
  const chain = await buildChain();
  const client = createClient({
    chain,
    account: account as `0x${string}`,
    provider,
  } as unknown as Parameters<typeof createClient>[0]);
  return client as unknown as GenLayerSdkClient;
}

let readPromise: Promise<GenLayerSdkClient> | null = null;
function readSdk(): Promise<GenLayerSdkClient> {
  readPromise ??= makeReadClient();
  return readPromise;
}

// The write client is rebuilt per call: the connected account can change.
async function write(functionName: string, args: unknown[], value = 0n): Promise<TxResult> {
  const client = await makeWriteClient();
  const hash = await client.writeContract({ address: contractAddress(), functionName, args, value });
  const txHash = typeof hash === "string" ? hash : String(hash);
  await client.waitForTransactionReceipt({ hash: txHash as `0x${string}`, status: "FINALIZED", retries: 60 });
  return { txHash };
}

async function readJson<S extends z.ZodTypeAny>(
  functionName: string,
  args: unknown[],
  schema: S,
): Promise<z.output<S>> {
  const client = await readSdk();
  const raw = await client.readContract({ address: contractAddress(), functionName, args });
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  return schema.parse(JSON.parse(text)) as z.output<S>;
}

export function createGenLayerGrudgeClient(): GrudgeClient {
  const getAll = async (): Promise<Challenge[]> => {
    const raws = await readJson("get_open_challenges", [], z.array(RawChallengeSchema));
    return raws.map(adaptChallenge);
  };

  return {
    mode: "genlayer",

    async getChallenge(id: string): Promise<Challenge> {
      const raw = await readJson("get_challenge", [Number(id)], RawChallengeSchema);
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

    async createChallenge(input: CreateChallengeInput): Promise<{ id: string; txHash: string }> {
      const { txHash } = await write(
        "create_challenge",
        [input.statement, input.evidencePolicy, input.category, input.durationDays, input.requiredProofs],
        toUnits(input.selfStake),
      );
      // The new id is the latest challenge by this creator.
      const all = await getAll();
      const latest = all[0];
      return { id: latest?.id ?? "0", txHash };
    },

    async stake(id: string, side: Side, amount: number, _from: string, taunt?: string): Promise<TxResult> {
      return write("stake", [Number(id), side, taunt ?? ""], toUnits(amount));
    },

    async submitEvidence(id: string, evidenceText: string): Promise<{ txHash: string; entry: EvidenceEntry }> {
      const { txHash } = await write("submit_evidence", [Number(id), evidenceText]);
      const challenge = await this.getChallenge(id);
      const entry = challenge.evidence[challenge.evidence.length - 1];
      if (!entry) throw new Error("Evidence was submitted but the verdict could not be read back.");
      return { txHash, entry };
    },

    async disputeEvidence(id: string, evidenceIndex: number, counterEvidence: string) {
      const { txHash } = await write("dispute_evidence", [Number(id), evidenceIndex, counterEvidence]);
      const challenge = await this.getChallenge(id);
      const entry = challenge.evidence[evidenceIndex];
      if (!entry) throw new Error("Dispute landed but the entry could not be read back.");
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

    async getProfile(address: string): Promise<Profile> {
      // Derived client-side from the challenge list (read-model; chain is truth).
      const all = await getAll();
      const mine = all.filter((c) => c.creator.toLowerCase() === address.toLowerCase());
      const kept = mine.filter((c) => c.status === "SUCCEEDED").length;
      const broken = mine.filter((c) => c.status === "FAILED" || (c.status === "SETTLED" && c.verifiedCount < c.requiredProofs)).length;
      const receipts = all
        .filter((c) => c.status !== "ACTIVE" && c.verifiedCount < c.requiredProofs)
        .flatMap((c) =>
          c.stakes
            .filter((s) => s.side === "doubt" && s.address.toLowerCase() === address.toLowerCase())
            .map((s) => ({ challengeId: c.id, statement: c.statement, amount: s.amount, winnings: 0 })),
        );
      return {
        address,
        kept,
        broken,
        earnings: 0,
        calledItReceipts: receipts,
        currentStreak: mine.filter((c) => c.status === "ACTIVE").reduce((m, c) => Math.max(m, c.verifiedCount), 0),
      };
    },

    async getLeaderboards(): Promise<Leaderboards> {
      const all = await getAll();
      return {
        mostUnbreakable: [],
        sharpestDoubters: [],
        biggestPots: all
          .map((c) => ({ challengeId: c.id, statement: c.statement, pot: c.believerPool + c.doubterPool + c.selfStake }))
          .sort((a, b) => b.pot - a.pot)
          .slice(0, 10),
      };
    },
  };
}
