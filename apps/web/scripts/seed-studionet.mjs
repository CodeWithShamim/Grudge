#!/usr/bin/env node
/**
 * Seed the deployed GRUDGE contract on GenLayer Studio with demo transactions
 * so a fresh deploy has live grudges to browse.
 *
 * What it does (studionet only — relies on sim_fundAccount):
 *   1. generates a pool of creators + stakers and funds them
 *   2. creators: create_challenge (self-stake attached, LLM-screened on-chain)
 *   3. stakers:  stake doubt/believe with taunts
 *
 * Targets exactly TX_TARGET writes (default 50): 10 create_challenge + 40 stake.
 * verify_anchor / submit_evidence are intentionally NOT seeded — the current
 * contract (v6.1) makes proof_anchor MANDATORY and gates evidence behind
 * verify_anchor, which needs a real external page hosting the ownership code.
 * We register a valid anchor URL per challenge (format-checked at create time)
 * but leave verification to a human with a real page.
 *
 * Reads NEXT_PUBLIC_RPC / NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS from
 * apps/web/.env.local (or the environment). Run from the repo root:
 *
 *   node apps/web/scripts/seed-studionet.mjs
 *
 * Consensus waits poll getTransaction directly — the SDK's
 * waitForTransactionReceipt(ACCEPTED) resolves on UNDETERMINED/CANCELED too
 * (see lib/chain/genlayer.ts for the same pattern in the app).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { transactionsStatusNumberToName } from "genlayer-js/types";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const out = {};
  try {
    for (const line of readFileSync(join(webRoot, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* .env.local optional — fall back to process.env */
  }
  return out;
}

const envFile = loadEnvLocal();
const env = (k) => process.env[k] ?? envFile[k] ?? "";

const RPC = env("NEXT_PUBLIC_RPC") || "https://studio.genlayer.com/api";
const CONTRACT = env("NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS");
if (!/^0x[0-9a-fA-F]{40}$/.test(CONTRACT)) {
  console.error("NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS missing/invalid — set it in apps/web/.env.local");
  process.exit(1);
}

const ONE_GEN = 10n ** 18n;
const chain = {
  ...studionet,
  rpcUrls: { default: { http: [RPC] }, public: { http: [RPC] } },
};

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function fundedAccount(label) {
  const account = createAccount(generatePrivateKey());
  // amount is a plain wei NUMBER on studionet (1000 GEN)
  await rpc("sim_fundAccount", [account.address, Number(1000n * ONE_GEN)]);
  console.log(`funded ${label}: ${account.address}`);
  return account;
}

const SUCCESS = new Set(["ACCEPTED", "FINALIZED"]);
const FAILURE = new Set(["UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDecision(client, hash, what, polls = 150) {
  await sleep(2000);
  for (let i = 0; i < polls; i++) {
    let tx = null;
    try {
      tx = await client.getTransaction({ hash });
    } catch {
      /* not indexed yet */
    }
    if (tx) {
      const raw = String(tx.status ?? "");
      const status = transactionsStatusNumberToName[raw] ?? raw;
      if (SUCCESS.has(status)) {
        console.log(`  ✓ ${what} — ${status} (${hash})`);
        return;
      }
      if (FAILURE.has(status)) throw new Error(`${what}: consensus ${status} (${hash})`);
    }
    await sleep(2000);
  }
  throw new Error(`${what}: timed out waiting for consensus (${hash})`);
}

// one client per account — reused across that account's writes
const clients = new Map();
function clientFor(account) {
  let c = clients.get(account.address);
  if (!c) {
    c = createClient({ chain, account });
    clients.set(account.address, c);
  }
  return c;
}

let txDone = 0;
let txTotal = 0;
// studionet consensus is non-deterministic for LLM-screened writes: the same
// valid call can come back UNDETERMINED/CANCELED. That is transient — resend it.
async function writeAs(account, functionName, args, value = 0n, attempts = 4) {
  const client = clientFor(account);
  txDone += 1;
  console.log(`[tx ${txDone}/${txTotal}] → ${functionName}(${args.map((a) => JSON.stringify(a)).join(", ")}) value=${value}`);
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const hash = await client.writeContract({ address: CONTRACT, functionName, args, value });
      await waitForDecision(client, hash, functionName);
      return client;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      // only retry transient consensus outcomes — a UserError (validation /
      // screening rejection) is deterministic and will never pass on resend.
      const transient = /UNDETERMINED|CANCELED|TIMEOUT|timed out|indexed/i.test(msg);
      if (!transient || attempt === attempts) break;
      console.log(`  ↻ retry ${attempt}/${attempts - 1} — ${msg}`);
      await sleep(3000);
    }
  }
  throw lastErr;
}

// 10 challenges × (1 create + 4 stakes) = 50 transactions.
// Every challenge registers a valid http(s) proof_anchor (MANDATORY in v6.1).
const CHALLENGES = [
  {
    statement: "I will run 5km every day for the next 14 days",
    policy:
      "Each proof period: a screenshot of a run tracker (Strava or similar) showing that day's date, distance >= 5km, and elapsed time. Old runs or manually entered activities do not count.",
    category: "fitness",
    durationDays: 14,
    requiredProofs: 7,
    selfStake: 5n * ONE_GEN,
    proofAnchor: "https://www.strava.com/athletes/seed-runner-01",
    stakes: [
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "You quit on day 3 last time. See you at settle." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "Nah, this year is different. I'm in." },
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "Rain on day 6 ends this. Easy doubt." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "Backing the grind." },
    ],
  },
  {
    statement: "I will publish one technical blog post every week for 4 weeks",
    policy:
      "Each proof period: a public URL to a newly published post (>= 600 words) with a visible publish date inside the period. Drafts, reposts, or backdated posts do not count.",
    category: "learning",
    durationDays: 28,
    requiredProofs: 4,
    selfStake: 8n * ONE_GEN,
    proofAnchor: "https://seed-writer-02.hashnode.dev",
    stakes: [
      { side: "believe", amount: 3n * ONE_GEN, taunt: "Actually, this one ships. Easy money." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Week 3 is where writers go to die." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Seen the drafts. This is happening." },
      { side: "doubt", amount: 1n * ONE_GEN, taunt: "One post, tops." },
    ],
  },
  {
    statement: "I will meditate for 10 minutes every morning for 21 days",
    policy:
      "Each proof period: a screenshot from a meditation app (Headspace, Calm, Insight Timer) showing a session of >= 10 minutes completed that morning, with the date visible.",
    category: "wellness",
    durationDays: 21,
    requiredProofs: 21,
    selfStake: 4n * ONE_GEN,
    proofAnchor: "https://seed-calm-03.notion.site/streak",
    stakes: [
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "You snooze twice every day. No chance." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Calm arc incoming." },
      { side: "doubt", amount: 1n * ONE_GEN, taunt: "Day 9 you'll 'forget'." },
      { side: "believe", amount: 3n * ONE_GEN, taunt: "Locked in on this one." },
    ],
  },
  {
    statement: "I will read 20 pages of a non-fiction book every day for 30 days",
    policy:
      "Each proof period: a photo of the book open to the day's stopping page plus a one-line takeaway. Same page two days running does not count.",
    category: "learning",
    durationDays: 30,
    requiredProofs: 15,
    selfStake: 6n * ONE_GEN,
    proofAnchor: "https://www.goodreads.com/user/show/seed-reader-04",
    stakes: [
      { side: "believe", amount: 2n * ONE_GEN, taunt: "You read fast. This is free." },
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "Netflix wins by day 5." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "20 pages is nothing. In." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Weekend collapse guaranteed." },
    ],
  },
  {
    statement: "I will do 50 pushups every day for the next 20 days",
    policy:
      "Each proof period: an unbroken video (or timestamped photo set) showing 50 pushups completed that day. Partial reps or clips from another day do not count.",
    category: "fitness",
    durationDays: 20,
    requiredProofs: 20,
    selfStake: 5n * ONE_GEN,
    proofAnchor: "https://www.youtube.com/@seed-pushups-05",
    stakes: [
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "Your form breaks at 20. Doubt." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "50 is warmup for you. Easy." },
      { side: "doubt", amount: 1n * ONE_GEN, taunt: "Sore day 4, quit day 5." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Backing the reps." },
    ],
  },
  {
    statement: "I will ship one small open-source pull request every day for 10 days",
    policy:
      "Each proof period: a link to a merged or open PR authored today against a public repo you do not own. Typo-only PRs do not count.",
    category: "coding",
    durationDays: 10,
    requiredProofs: 10,
    selfStake: 7n * ONE_GEN,
    proofAnchor: "https://github.com/seed-dev-06",
    stakes: [
      { side: "believe", amount: 3n * ONE_GEN, taunt: "You live on GitHub. This is nothing." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Maintainers ghost you by day 4." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "Ten PRs? Done by lunch." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Green squares lie." },
    ],
  },
  {
    statement: "I will practice Spanish on Duolingo for 15 minutes daily for 25 days",
    policy:
      "Each proof period: a screenshot of the Duolingo daily summary showing >= 15 minutes of Spanish practice on that date. Streak-freeze days without lessons do not count.",
    category: "learning",
    durationDays: 25,
    requiredProofs: 25,
    selfStake: 4n * ONE_GEN,
    proofAnchor: "https://www.duolingo.com/profile/seed-lingo-07",
    stakes: [
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Your streak died at 6 last time." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "The owl has you now. In." },
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "Weekend streak freeze = cheating. Doubt." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "Vamos, backing you." },
    ],
  },
  {
    statement: "I will wake up before 6am every weekday for the next three weeks",
    policy:
      "Each proof period: a timestamped photo taken outdoors before 6:00am local time on a weekday. Weekends are exempt.",
    category: "habits",
    durationDays: 21,
    requiredProofs: 15,
    selfStake: 6n * ONE_GEN,
    proofAnchor: "https://seed-earlybird-08.notion.site/log",
    stakes: [
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "You are not a morning person. Never were." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "New alarm, new you. I'll take it." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Monday one, then dark." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Sunrise crew. Backing it." },
    ],
  },
  {
    statement: "I will cook a home meal instead of ordering out every day for 14 days",
    policy:
      "Each proof period: a photo of that day's home-cooked meal with the date, plus a one-line note on what it was. Restaurant or delivery meals do not count.",
    category: "habits",
    durationDays: 14,
    requiredProofs: 14,
    selfStake: 3n * ONE_GEN,
    proofAnchor: "https://www.instagram.com/seed-kitchen-09",
    stakes: [
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "One busy night and it's delivery again." },
      { side: "believe", amount: 3n * ONE_GEN, taunt: "You actually cook well. Easy believe." },
      { side: "doubt", amount: 1n * ONE_GEN, taunt: "Friday takeout is sacred. Doubt." },
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Meal-prep energy. In." },
    ],
  },
  {
    statement: "I will sketch one drawing every day for the next 30 days",
    policy:
      "Each proof period: a photo of a dated, freshly drawn sketch. AI-generated images and reposts of old work do not count.",
    category: "creative",
    durationDays: 30,
    requiredProofs: 15,
    selfStake: 5n * ONE_GEN,
    proofAnchor: "https://www.behance.net/seed-artist-10",
    stakes: [
      { side: "believe", amount: 2n * ONE_GEN, taunt: "Your sketchbook is already full. Easy." },
      { side: "doubt", amount: 3n * ONE_GEN, taunt: "Motivation dies at day 8, art always does." },
      { side: "believe", amount: 1n * ONE_GEN, taunt: "One line a day counts. In." },
      { side: "doubt", amount: 2n * ONE_GEN, taunt: "Blank pages by week 2." },
    ],
  },
];

// SEED_START_INDEX skips the first N challenge templates — used to RESUME a
// run that already committed some challenges (studionet consensus can drop a
// tx mid-run), so we continue without re-creating what's already on-chain.
const START = Math.max(0, Number(env("SEED_START_INDEX") || 0));
const PLAN = CHALLENGES.slice(START);
txTotal = PLAN.reduce((n, c) => n + 1 + c.stakes.length, 0);

async function main() {
  console.log(`Seeding GRUDGE at ${CONTRACT} via ${RPC}`);
  if (START > 0) console.log(`Resuming from challenge template index ${START} (skipping ${START} already on-chain)`);
  console.log(`Target: ${txTotal} transactions (${PLAN.length} create_challenge + ${txTotal - PLAN.length} stake)\n`);

  // creator pool (round-robin) + staker pool (never the creator, so doubt is legal)
  const creators = [];
  for (let i = 0; i < 4; i++) creators.push(await fundedAccount(`creator${i + 1}`));
  const stakers = [];
  for (let i = 0; i < 6; i++) stakers.push(await fundedAccount(`staker${i + 1}`));
  console.log("");

  const reader = createClient({ chain });
  let stakerCursor = 0;
  const nextStaker = () => stakers[stakerCursor++ % stakers.length];

  for (let ci = 0; ci < PLAN.length; ci++) {
    const c = PLAN[ci];
    const creator = creators[ci % creators.length];
    await writeAs(
      creator,
      "create_challenge",
      [c.statement, c.policy, c.category, c.durationDays, c.requiredProofs, c.proofAnchor],
      c.selfStake,
    );
    // newest id == page total (ids are sequential from 1)
    const page = JSON.parse(
      await reader.readContract({ address: CONTRACT, functionName: "get_challenges_page", args: [0, 1] }),
    );
    const id = page.total;
    console.log(`  challenge id ${id}: "${c.statement}"`);
    for (const s of c.stakes) {
      await writeAs(nextStaker(), "stake", [id, s.side, s.taunt], s.amount);
    }
  }

  const page = JSON.parse(
    await reader.readContract({ address: CONTRACT, functionName: "get_challenges_page", args: [0, 50] }),
  );
  console.log(`\nDone — ${txDone} tx sent. ${page.total} challenge(s) on the contract:`);
  for (const ch of page.challenges) {
    console.log(
      `  #${ch.id} [${ch.status}] "${ch.statement}" — believe ${ch.believer_pool} / doubt ${ch.doubter_pool}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
