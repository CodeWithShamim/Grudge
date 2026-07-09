#!/usr/bin/env node
/**
 * Seed the deployed GRUDGE contract on GenLayer Studio with demo transactions
 * so a fresh deploy has live grudges to browse.
 *
 * What it does (studionet only — relies on sim_fundAccount):
 *   1. generates two throwaway accounts (creator, rival) and funds them
 *   2. creator: create_challenge ×2 (self-stake attached, LLM-screened on-chain)
 *   3. rival:   stake doubt/believe with taunts
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

async function writeAs(account, functionName, args, value = 0n) {
  const client = createClient({ chain, account });
  console.log(`→ ${functionName}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
  const hash = await client.writeContract({ address: CONTRACT, functionName, args, value });
  await waitForDecision(client, hash, functionName);
  return client;
}

const CHALLENGES = [
  {
    statement: "I will run 5km every day for the next 14 days",
    policy:
      "Each proof period: a screenshot of a run tracker (Strava or similar) showing that day's date, distance >= 5km, and elapsed time. Old runs or manually entered activities do not count.",
    category: "fitness",
    durationDays: 14,
    requiredProofs: 7,
    selfStake: 5n * ONE_GEN,
    stake: { side: "doubt", amount: 2n * ONE_GEN, taunt: "You quit on day 3 last time. See you at settle." },
  },
  {
    statement: "I will publish one technical blog post every week for 4 weeks",
    policy:
      "Each proof period: a public URL to a newly published post (>= 600 words) with a visible publish date inside the period. Drafts, reposts, or backdated posts do not count.",
    category: "learning",
    durationDays: 28,
    requiredProofs: 4,
    selfStake: 8n * ONE_GEN,
    stake: { side: "believe", amount: 3n * ONE_GEN, taunt: "Actually, this one ships. Easy money." },
  },
];

async function main() {
  console.log(`Seeding GRUDGE at ${CONTRACT} via ${RPC}\n`);
  const creator = await fundedAccount("creator");
  const rival = await fundedAccount("rival");

  const reader = createClient({ chain });
  for (const c of CHALLENGES) {
    await writeAs(
      creator,
      "create_challenge",
      [c.statement, c.policy, c.category, c.durationDays, c.requiredProofs, ""],
      c.selfStake,
    );
    // newest id == page total (ids are sequential from 1)
    const page = JSON.parse(await reader.readContract({
      address: CONTRACT,
      functionName: "get_challenges_page",
      args: [0, 1],
    }));
    const id = page.total;
    console.log(`  challenge id ${id}: "${c.statement}"`);
    await writeAs(rival, "stake", [id, c.stake.side, c.stake.taunt], c.stake.amount);
  }

  const page = JSON.parse(await reader.readContract({
    address: CONTRACT,
    functionName: "get_challenges_page",
    args: [0, 10],
  }));
  console.log(`\nDone — ${page.total} challenge(s) on the contract:`);
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
