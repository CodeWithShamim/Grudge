<div align="center">

# GRUDGE

### _Your friends bet you'll fail._

A social-accountability game on **GenLayer**. Stake GEN on a public promise.
Let believers back you and doubters bet against you. Submit evidence — and let
**validator LLMs reach consensus** on whether you kept your word.

Every doubt recorded · every receipt public · refereed by GenLayer validator consensus.

[Quickstart](#quickstart) · [How it works](#how-it-works) · [Architecture](#architecture) · [Deploy to GenLayer](#deploy-to-genlayer) · [Quality gates](#quality-gates)

</div>

---

## What is GRUDGE?

GRUDGE turns a personal commitment into a public, on-chain market.

1. **You stake** GEN on a concrete, time-boxed claim — _"I will run 5km every day for 30 days."_
2. **Others take a side.** Believers stake that you'll do it; doubters stake (with public taunts) that you won't. The pools — and the odds — move in real time.
3. **You submit evidence.** The contract's judging prompt runs _inside validator consensus_ and returns a verdict: `VERIFIED` / `SUSPICIOUS` / `REJECTED`.
4. **The contract settles** at the deadline. Keep the promise and take the doubters' pool; fold and they collect. Winners `claim()` their payout. No human referee, ever.

## Why this needs GenLayer

The referee is a **subjective judgment** — _"does this evidence actually prove the promise?"_ — that no deterministic EVM contract or single oracle can make trustlessly.

GenLayer's Intelligent Contracts run that judgment _inside consensus_: `gl.eq_principle_prompt_comparative` has the validator set each execute the judging prompt and agree on the verdict, so the outcome is a **consensus artifact**, not one model's opinion. Prompt-injection attempts inside submitted evidence are adjudicated by that same consensus and auto-`REJECTED`.

> No other chain can settle _"did you actually do the thing?"_ without trusting a human.

## How it works

```
create_challenge ──▶ stake (believe / doubt) ──▶ submit_evidence ──▶ [validator consensus]
                                                                            │
                                          VERIFIED / SUSPICIOUS / REJECTED ─┘
                                                       │
                       dispute_evidence ◀──────────────┤
                                                       ▼
                                  settle ──▶ claim (winners withdraw)
```

The chain is the single source of truth. The web app holds **no** authoritative state.

## Quickstart

Zero config — boots on an in-memory mock chain with seeded grudges, so the full
loop is playable immediately.

```sh
pnpm i && pnpm dev          # http://localhost:3000
```

**Requirements:** Node ≥ 20, pnpm 10.

Play the loop end to end: landing → challenge → stake → submit evidence →
verdict stamp → settle → claim. To use a real LLM for the mock judge (same
prompt as the contract), set `ANTHROPIC_API_KEY` in `apps/web/.env.local`;
without it a deterministic heuristic keeps everything zero-config.

## Architecture

```
apps/web/                 Next.js 15 App Router · TS strict · Tailwind · Framer Motion
  app/(marketing)/        landing: hero (live ledger) → how-it-works → live feed
  app/docs/               in-app documentation page
  app/challenge/[id]/     challenge detail: tug-of-war, evidence tribunal, settle
  app/create/             create-challenge wizard (pre-flight LLM screening)
  lib/chain/              ONE adapter interface (GrudgeClient): mock.ts ⇄ genlayer.ts
  lib/motion/             motion tokens + variants (single reduced-motion gate)
  lib/psychology/         pure, unit-tested copy engine (odds lines, nudges, captions)
  app/api/judge/          mock judge proxy — SAME prompt as the contract

contracts/
  grudge.py               GenVM Intelligent Contract
  scripts/genvm_lint.py   custom AST linter for GenVM contract rules
```

Every chain access in the app goes through a `GrudgeClient`; components never
touch `genlayer-js` or `viem` directly. Mock mode ships **no** wallet/chain JS.

### Contract surface (`contracts/grudge.py`)

| Method | Kind | Purpose |
| --- | --- | --- |
| `create_challenge(statement, evidence_policy, category, duration_days, required_proofs)` | `write.payable` | Open a grudge; the GEN sent is your self-stake. |
| `stake(challenge_id, side, taunt)` | `write.payable` | Back (`believe`) or bet against (`doubt`) with an optional public taunt. |
| `submit_evidence(challenge_id, evidence_text)` | `write` | Submit a proof; validators reach consensus on the verdict. |
| `dispute_evidence(challenge_id, index, counter_evidence)` | `write` | Challenge a `VERIFIED` entry; consensus re-judges. |
| `settle(challenge_id)` | `write` | After the deadline, resolve and credit winners' ledgers. |
| `claim()` | `write` | Withdraw your settled winnings. |
| `get_challenge`, `get_open_challenges`, `get_challenges_page`, `get_claimable` | `view` | Read-only chain queries. |

## Deploy to GenLayer

The default real-network target is hosted **GenLayer Studio** (feeless).

```sh
npm i -g genlayer-cli
genlayer network studionet                  # or testnet-bradbury
make -C contracts deploy                     # deploys grudge.py; writes the address to
                                             # apps/web/.env.local + contracts/deployments.json
```

Then set `apps/web/.env.local` (see `apps/web/.env.example`):

```sh
NEXT_PUBLIC_CHAIN_MODE=genlayer
NEXT_PUBLIC_BRADBURY_CHAIN_ID=61999                       # Studio (Bradbury: 4221)
NEXT_PUBLIC_BRADBURY_RPC=https://studio.genlayer.com/api
NEXT_PUBLIC_BRADBURY_EXPLORER=https://studio.genlayer.com
NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS=0x…                   # from the deploy step
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=                     # optional (injected-wallet dev)
```

In `genlayer` mode the header shows a RainbowKit **Connect Wallet** button;
writes sign through the connected wallet, and tx toasts link to the explorer.
On Studio, fund your account from the simulator before a value-carrying write:

```sh
curl -X POST https://studio.genlayer.com/api -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"sim_fundAccount","params":["0xYOUR_ADDRESS", 500000000000000000000],"id":1}'
#                                                            └ amount is in wei (500 GEN)
```

## Quality gates

```sh
pnpm typecheck && pnpm lint && pnpm test     # web: TS strict, ESLint, vitest
pnpm e2e                                      # Playwright core-loop (mock mode)
make -C contracts lint                        # ruff --select ALL, mypy --strict, genvm_lint.py
make -C contracts test                        # settle-math units + gltest --network studionet
```

`contracts/scripts/genvm_lint.py` enforces GenVM rules via AST: a `Depends`
header, exactly one `gl.Contract`, storable state, public decorators, no state
mutation in views, nondet calls only inside `gl.eq_principle_*` closures, no
storage writes in nondet blocks, no banned imports, and
`json.dumps(..., sort_keys=True)` for all LLM JSON. CI runs all jobs on every PR.

## Tech stack

- **Frontend** — Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, Framer Motion
- **Wallet / chain** — `genlayer-js`, wagmi, RainbowKit, viem
- **Data** — TanStack Query, Zod (schema-validated chain reads)
- **Contract** — Python GenVM Intelligent Contract on GenLayer
- **Tooling** — pnpm workspaces, Vitest, Playwright, ESLint, ruff, mypy

---

<div align="center">
<sub>Built on <a href="https://genlayer.com">GenLayer</a> · optimistic democracy over LLM judgment.</sub>
</div>
