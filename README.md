<div align="center">

# GRUDGE

### _Your friends bet you'll fail._

A social-accountability game on **GenLayer**. Stake GEN on a public promise.
Let believers back you and doubters bet against you. Submit evidence — and let
**validator LLMs reach consensus** on whether you kept your word.

Every doubt recorded · every receipt public · refereed by GenLayer validator consensus.

[Quickstart](#quickstart) · [How it works](#how-it-works) · [Sign-in](#sign-in--silent-signing) · [Architecture](#architecture) · [Deploy](#deploy-to-genlayer) · [Quality gates](#quality-gates)

</div>

Live link: [grudge.market](https://www.grudges.site/)

---

## What is GRUDGE?

GRUDGE turns a personal commitment into a public, on-chain market.

1. **You stake** GEN on a concrete, time-boxed claim — _"I will run 5km every day for 30 days."_
2. **Others take a side.** Believers stake that you'll do it; doubters stake (with public taunts) that you won't. The pools — and the odds — move in real time.
3. **You submit evidence.** The contract's judging prompt runs _inside validator consensus_ and returns a verdict: `VERIFIED` / `SUSPICIOUS` / `REJECTED`.
4. **The contract settles** at the deadline. Keep the promise and take the doubters' pool; fold and they collect. Winners `claim()` their payout. No human referee, ever.

## Why this needs GenLayer

The referee is a **subjective judgment** — _"does this evidence actually prove the promise?"_ — that no deterministic EVM contract or single oracle can make trustlessly.

GenLayer's Intelligent Contracts run that judgment _inside consensus_: `gl.eq_principle.prompt_comparative` has the validator set each execute the judging prompt and agree on the verdict, so the outcome is a **consensus artifact**, not one model's opinion. Prompt-injection attempts inside submitted evidence are adjudicated by that same consensus and auto-`REJECTED`.

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

## Sign-in & silent signing

GRUDGE has **no wallet extension, no seed phrase, no transaction popups**. Auth is
**email + a one-time code** (Privy), and on first login Privy provisions an
**embedded wallet** whose key it custodies — so every write (`create`, `stake`,
`submit_evidence`, `dispute`, `settle`, `claim`) signs **silently**, with no fee
confirmation.

- On **studionet** the embedded wallet is **auto-funded** with simulated GEN the
  first time it's empty, so a new user can act seconds after signing in.
- On **Bradbury** (real testnet GEN) there is **no auto-fund** — the UI surfaces
  the faucet, and value actions get an in-app confirm.

`lib/auth/` is the only place that touches Privy; the rest of the app consumes
`useAuth()` / `useEmailLogin()`. See [`apps/web/AUTH.md`](apps/web/AUTH.md) for the
full model (where the key lives, server token verification, the studionet-vs-Bradbury
boundary). A CI guard (`pnpm guard:wallet`) fails the build if any
`wagmi` / `@rainbow-me/rainbowkit` / `window.ethereum` reference returns — the
embedded wallet is the only signer.

## Quickstart

Zero config — boots on an in-memory mock chain with seeded grudges, so the full
loop is playable immediately (no Privy, no wallet, no network).

```sh
pnpm i && pnpm dev          # http://localhost:3000  (CHAIN_MODE=mock)
```

**Requirements:** Node ≥ 20, pnpm 10.

Play the loop end to end: landing → challenge → stake → submit evidence →
verdict stamp → settle → claim. To use a real LLM for the mock judge (same
prompt as the contract), set `ANTHROPIC_API_KEY` in `apps/web/.env.local`;
without it a deterministic heuristic keeps everything zero-config.

## Architecture

```
apps/web/                 Next.js 15 App Router · React 19 · TS strict · Tailwind · Framer Motion
  app/(marketing)/        landing: hero (live market) → how-it-works → live feed
  app/explorer/           browse/search every grudge (paginated, all statuses)
  app/docs/               in-app documentation page (+ FAQ structured data)
  app/challenge/[id]/     challenge detail: tug-of-war, evidence tribunal, settle
  app/create/             create-challenge wizard (pre-flight LLM screening)
  app/api/judge/          stateless screening/judge proxy — SAME prompt as the contract

  lib/auth/               ONLY Privy touchpoint: useAuth, useEmailLogin, server verify
  lib/chain/              ONE adapter interface (GrudgeClient): mock.ts ⇄ genlayer.ts
    authBridge.ts         embedded-wallet provider → genlayer-js (plain TS, no React)
    fund.ts               studionet-only auto-fund (balance-gated; Bradbury tripwire)
  lib/motion/             motion tokens + variants (single reduced-motion gate)
  lib/psychology/         pure, unit-tested copy engine (odds lines, nudges, captions)
  lib/seo.ts              SEO/AEO config (metadata, OG, sitemap, JSON-LD)

contracts/
  grudge.py               GenVM Intelligent Contract
  scripts/genvm_lint.py   custom AST linter for GenVM contract rules
```

Every chain access in the app goes through a `GrudgeClient`; components never
touch `genlayer-js` or `viem` directly, and the embedded signer reaches the
adapter through `authBridge` (no React imports in the chain layer). Mock mode
ships **no** auth/chain JS.

### Contract surface (`contracts/grudge.py`)

| Method | Kind | Purpose |
| --- | --- | --- |
| `create_challenge(statement, evidence_policy, category, duration_days, required_proofs)` | `write.payable` | Open a grudge; the GEN sent is your self-stake. |
| `stake(challenge_id, side, taunt)` | `write.payable` | Back (`believe`) or bet against (`doubt`) with an optional public taunt. |
| `submit_evidence(challenge_id, evidence_text)` | `write` | Submit a proof; validators reach consensus on the verdict. |
| `dispute_evidence(challenge_id, index, counter_evidence)` | `write` | Challenge a `VERIFIED` entry; consensus re-judges. |
| `settle(challenge_id)` | `write` | After the deadline, resolve and credit winners' ledgers. |
| `claim()` | `write` | Withdraw your settled winnings. |
| `get_challenge` · `get_challenge_summary` | `view` | Full / bounded single-challenge reads. |
| `get_challenges_page(offset, limit)` | `view` | Paginated **summaries** (no nested arrays) — the only list read. |
| `get_stakes_page` · `get_evidence_page` | `view` | Paginate a single challenge's stakes / evidence. |
| `get_claimable(address)` · `get_solvency()` | `view` | Withdrawable balance · contract liability invariant. |

> All list/detail reads are **bounded** — there is no unbounded view, so views
> never revert as the ledger grows.

### Live deployment

| Network | Contract address | Explorer |
| --- | --- | --- |
| **GenLayer Studio** | `0xb9b501D7c617Cd26d93B61BA996fc67a6002379c` | [view contract ↗](https://explorer-studio.genlayer.com/address/0xb9b501D7c617Cd26d93B61BA996fc67a6002379c) |

The frontend reads this from `NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS`; redeploys
update `apps/web/.env.local` and `contracts/deployments.json`.

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

# Auth (Privy) — create an app at https://dashboard.privy.io:
#   • enable Email login • embedded wallets: create on login • whitelist your origins
NEXT_PUBLIC_PRIVY_APP_ID=...
PRIVY_APP_SECRET=...                        # server-only — never NEXT_PUBLIC

# Network + chain (read by lib/chain/bradbury.ts)
NEXT_PUBLIC_NETWORK=studionet               # studionet (auto-fund) | bradbury (faucet)
NEXT_PUBLIC_STUDIO_RPC=https://studio.genlayer.com/api
NEXT_PUBLIC_CHAIN_ID=61999                  # Studio (Bradbury: 4221)
NEXT_PUBLIC_RPC=https://studio.genlayer.com/api
NEXT_PUBLIC_EXPLORER=https://explorer-studio.genlayer.com
NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS=0x…     # from the deploy step
```

In `genlayer` mode the header shows an **email Sign-in** chip; after sign-in the
embedded wallet signs every write silently and tx toasts link to the explorer.
On studionet the wallet auto-funds when empty; to fund manually:

```sh
curl -X POST https://studio.genlayer.com/api -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"sim_fundAccount","params":["0xYOUR_ADDRESS", 1000000000000000000000],"id":1}'
#                                                            └ amount is a wei NUMBER (1000 GEN)
```

## Quality gates

```sh
pnpm typecheck && pnpm lint && pnpm test     # web: TS strict, ESLint, vitest, wallet-lib guard
pnpm guard:wallet                             # fail if wagmi/rainbowkit/window.ethereum return
pnpm e2e                                      # Playwright core-loop (mock mode)
make -C contracts lint                        # ruff --select ALL, mypy --strict, genvm-lint check+typecheck
make -C contracts test                        # Direct Mode tests (real contract, in-memory) + settle-math
make -C contracts test-chain                  # Studio-mode integration suite (needs a GenLayer simulator)
```

Contract tests use GenLayer's **Direct Mode** ([docs](https://docs.genlayer.com/api-references/genlayer-test)):
`make test` deploys and runs the REAL `grudge.py` in-memory with the LLM mocked
(`direct_vm.mock_llm`) and the clock controllable (`warp`) — no Docker, no
network, milliseconds. The Studio-mode suite (`test-chain`, `tests/test_grudge.py`)
runs the same flows over real multi-validator consensus against a simulator.

`contracts/scripts/genvm_lint.py` enforces GenVM rules via AST: a `Depends`
header, exactly one `gl.Contract`, storable state, public decorators, no state
mutation in views, nondet calls only inside `gl.eq_principle_*` closures, no
storage writes in nondet blocks, no banned imports, and
`json.dumps(..., sort_keys=True)` for all LLM JSON. CI runs all jobs on every PR.

## Tech stack

- **Frontend** — Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, Framer Motion
- **Auth / wallet** — Privy (`@privy-io/react-auth` + `@privy-io/server-auth`) email login + embedded wallet
- **Chain** — `genlayer-js`, viem (signing only, via the embedded provider)
- **Data** — TanStack Query, Zod (schema-validated chain reads)
- **Contract** — Python GenVM Intelligent Contract on GenLayer
- **Tooling** — pnpm workspaces, Vitest, Playwright, ESLint, ruff, mypy

---

<div align="center">
<sub>Built on <a href="https://genlayer.com">GenLayer</a> · optimistic democracy over LLM judgment.</sub>
</div>
