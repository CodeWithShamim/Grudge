# GRUDGE — _your friends bet you'll fail._

A social accountability game on **GenLayer**. You stake GEN on a public real-world promise
("I will run 5km every day for 30 days"). Friends stake **for** (believers) or **against**
(doubters) you — with public taunts. You submit evidence; **validator LLMs reach consensus**:
`VERIFIED / SUSPICIOUS / REJECTED`. At the deadline the contract settles: keep the promise and
take the doubters' pool, or fold and mint their "Called It" receipts. Every doubt recorded,
every receipt public.

## Why this is impossible without GenLayer

The referee is a _subjective judgment_ — "does this evidence prove the promise?" — that no
deterministic EVM contract or single oracle can make trustlessly. GenLayer's Intelligent
Contracts run that judgment inside consensus: `gl.eq_principle_prompt_comparative` has the
validator set each run the judging prompt and agree on the verdict enum, so the outcome is a
consensus artifact, not one model's opinion. Injection attempts in evidence are adjudicated
_by the same consensus_ (auto-REJECTED).

## Quickstart (zero config)

```sh
pnpm i && pnpm dev          # http://localhost:3000 — mock chain, seeded grudges
```

Full loop playable immediately: landing → challenge → stake (flying chip) → evidence
(validator arc) → verdict (stamp) → settle (ticket tear / receipts deal-out).
`/dev/components` is the motion-design gallery.

## Architecture

```
apps/web        Next.js 15 App Router, TS strict, Tailwind, Framer Motion + GSAP/Lenis
  lib/chain     ONE adapter interface (GrudgeClient): mock.ts ⇄ genlayer.ts (genlayer-js)
  lib/motion    motion tokens + shared variants (single reduced-motion gate)
  lib/psychology  pure, unit-tested copy engine (odds lines, nudges, captions)
  app/api/judge   mock judge proxy — SAME prompt as the contract (LLM if keyed, heuristic if not)
contracts/grudge.py  GenVM Intelligent Contract (screening, judging, dispute, settle, claim)
```

Chain is the source of truth; the web app holds no authoritative state.

## Real chain: Testnet Bradbury

```sh
npm i -g genlayer-cli                       # GenLayer CLI
genlayer network testnet-bradbury           # switch network
# fund your account with testnet GEN via the GenLayer faucet
make -C contracts deploy                    # deploys grudge.py, writes address to
                                            # apps/web/.env.local + contracts/deployments.json
```

Then set in `apps/web/.env.local` (values from `genlayer network info` — never hardcoded):

```
NEXT_PUBLIC_CHAIN_MODE=genlayer
NEXT_PUBLIC_CHAIN_ID=…
NEXT_PUBLIC_RPC=…
NEXT_PUBLIC_EXPLORER=…
```

The header gains a RainbowKit ConnectButton; wrong network → one-click "Switch to Bradbury";
tx toasts link to the explorer.

## Quality gates

```sh
pnpm typecheck && pnpm lint && pnpm test    # web: TS strict, ESLint, 28 vitest cases
pnpm e2e                                    # Playwright core-loop (mock mode)
make -C contracts lint                      # ruff --select ALL, mypy --strict, genvm_lint.py
make -C contracts test                      # settle-math units + gltest --network studionet
make -C contracts test-bradbury             # pre-release verification (history resets)
```

`contracts/scripts/genvm_lint.py` is a custom AST linter: Depends header, exactly one
`gl.Contract`, storable state, public decorators, no state mutation in views, nondet calls
only inside `gl.eq_principle_*` closures, no storage in nondet blocks, banned imports,
`json.dumps(..., sort_keys=True)` for all LLM JSON. CI runs all three jobs (web / contracts /
e2e) on every PR.

## Builder pitch

Loss aversion + public commitment + spite is the oldest growth engine there is — GRUDGE just
gives it a trustless referee. Every verdict moment ("5/5 nodes agree") is a shareable artifact
that markets GenLayer's core primitive itself: optimistic democracy over LLM judgment. No
other chain can settle "did you actually do the thing?" without a human oracle.
