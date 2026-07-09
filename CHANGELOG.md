# Changelog

All notable changes to the GRUDGE contract and the `lib/chain` adapter it backs.
Dates are when the work landed; the contract is versioned by its on-chain
storage layout (`SCHEMA_VERSION`).

---

## v6.1 — Mandatory Anchored Proof (2026-07-09)

Tightens Anchored Proof from opt-in to required: `create_challenge` now rejects
an empty `proof_anchor`, so **every** challenge registers a proof source and
must `verify_anchor` before it can accept evidence. The "casual/unanchored"
text-only proof path is gone — all evidence must link to the verified host.

> **⚠️ Requires a fresh deploy.** No storage-layout change (`SCHEMA_VERSION`
> stays **4**), but the create-time validation changed, so a redeploy makes the
> new rule explicit. The frontend create wizard marks the proof source
> **required** and `ProofAnchor` adds a copy-to-clipboard for the ownership code.

### Deployed — 2026-07-09

- **GenLayer Studio: [`0x6A21dc70A225dD2179F0E0EE96E0eFF7210E27f7`](https://explorer-studio.genlayer.com/address/0x6A21dc70A225dD2179F0E0EE96E0eFF7210E27f7)** (schema 4, mandatory anchor). `apps/web/.env.local`, `contracts/deployments.json`, and the README deployment table all point here.
- The prior optional-anchor v6 (`0x503Cd4…9817`) drops to **previous** in `deployments.json`, the README table, and the docs "previous deployments" list.

---

## v6 — Anchored Proof (2026-07-09)

Moves the proof boundary from "validators judge submitted text" to "validators
verify an owned, timestamped source" (the gap called out in the submission
review): identity, account ownership, and the proof period are now enforced
before/around the LLM judgment instead of being left to it.

> **⚠️ Requires a fresh deploy.** `Challenge` gained two fields
> (`proof_anchor: str`, `anchor_verified: bool`) and `create_challenge` gained
> a parameter. `SCHEMA_VERSION` bumped **3 → 4**. After deploying, update
> `NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS`.

### Deployed — 2026-07-09

- **GenLayer Studio: [`0x503Cd4D2f88520c1f8a6455cC958199508789817`](https://explorer-studio.genlayer.com/address/0x503Cd4D2f88520c1f8a6455cC958199508789817)** (schema 4). `apps/web/.env.local`, `contracts/deployments.json`, and the README deployment table all point here.
- Previous deployments stay referenced (README + `deployments.json` + commented `.env.local` block) so the team can re-test earlier transactions: Studio v5 `0xb9b501…379c`, Bradbury `0x652789…80C6` / `0xaba1Db…819C`.
- New `apps/web/scripts/seed-studionet.mjs` seeds the fresh contract with demo transactions (funded throwaway accounts → `create_challenge` → `stake`s) so the ledger isn't empty on first load.

### Frontend integration (landed 2026-07-09, commit `87f3d32`)

- `GrudgeClient` gained `getAnchorInfo` / `verifyAnchor` (genlayer + mock adapters), with `AnchorInfoSchema` in `types.ts` and `useAnchorInfo` / `useVerifyAnchor` hooks.
- New `ProofAnchor` component: anchor badge + the creator's verify flow (shows the `grudge-<id>-<addr>` code to paste, fires `verify_anchor`, which is on the slow AI-writes poll path since it runs a web-fetch consensus round).
- Create wizard: optional "Proof source URL" field wired through `create_challenge`'s new `proof_anchor` arg; `EvidenceTribunal` blocks evidence submission until an anchored grudge is verified.
- `judgePrompt.ts` mirrors the contract's new TIME WINDOW / ANCHORED PROOF prompt blocks so the mock judge matches on-chain behavior; mock client tests extended to cover the anchor origin gate.

### Added — contract methods (ABI deltas)

| Method | Kind | Signature → returns |
| --- | --- | --- |
| `verify_anchor` | **write** *(web-fetch consensus)* | `(challenge_id: int) -> str` → `{"anchor","code","verified"}` |
| `get_anchor_code` | view | `(challenge_id: int) -> str` → `{"anchor","code","verified"}` |

Contract method count: **17 → 19** (views **10 → 11**, writes **7 → 8**).

### Changed — contract

- **`create_challenge(…, proof_anchor: str)`** — new trailing parameter. `""` = unanchored (previous behavior); a non-empty value must be one http(s) URL ≤ 200 chars and registers the challenge's proof source.
- **`verify_anchor`** — ownership proof: the validator set fetches the anchor page and checks a challenge-bound code (`grudge-<id>-<creator-addr-prefix>`) appears on it, via `gl.eq_principle.strict_eq` (deterministic containment on non-deterministically fetched content — no LLM round).
- **`submit_evidence`** — deterministic pre-consensus gates on anchored challenges: anchor must be verified, evidence must contain ≥1 link, and every link's host must equal the anchor host. The judge prompt gains a **TIME WINDOW** block (this proof period's pinned start/end) and, when anchored, an **ANCHORED PROOF** block requiring the verdict to rest on the fetched page — an unfetchable anchored link is deterministically REJECTED.
- **`get_challenge`** — `+ proof_anchor`, `+ anchor_verified`; **`get_challenges_page`** summaries — `+ anchor_verified`.

### Added — web

- `GrudgeClient.getAnchorInfo` / `GrudgeClient.verifyAnchor` (genlayer + mock; the mock mirrors the origin gate).
- `ProofAnchor` component: anchor badge on the challenge page + the creator's verification flow (shows the code to paste, fires `verify_anchor`).
- Create wizard: optional "Proof source URL" field; the tribunal blocks evidence submission until an anchored grudge is verified.

Deliberate scope note: the anchor proves *account ownership*, not human truth —
the defensible claim is "evidence must come from an owned, platform-timestamped
source," not "cheating is impossible."

---

## v5 — GenLayer-native features (2026-06-15)

Four high-impact features on top of the hardened contract, built without
weakening any existing security property: every new payable path updates
`total_locked` and calls `_assert_solvent()`; every new LLM call lives in a
zero-arg fn inside `gl.eq_principle.prompt_comparative` with `sort_keys=True`;
every new view is bounded.

> **⚠️ Requires a fresh deploy.** Storage layout changed (`Evidence` gained two
> fields; a new `reputation` map). `SCHEMA_VERSION` bumped **2 → 3**. studionet
> history resets, so this is a clean redeploy — there is no in-place migration.
> After deploying, update `NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS`.

### Added — contract methods (ABI deltas)

| Method | Kind | Signature → returns |
| --- | --- | --- |
| `appeal_verdict` | **write · payable** | `(challenge_id: int, evidence_index: int) -> str` → `{"verdict","reason","confidence"}` |
| `get_reputation` | view | `(address: str) -> str` → reputation object (below) |
| `explain_verdict` | view *(runs consensus)* | `(challenge_id: int, evidence_index: int) -> str` → `{"verdict","explanation"}` (explanation ≤ 600 chars) |
| `suggest_evidence_policy` | view *(runs consensus)* | `(statement: str) -> str` → `{"policy","rationale"}` (each ≤ 280 chars) |

Contract method count: **13 → 17** (views **7 → 10**, writes **6 → 7**).

### Changed — contract

- **`create_challenge(statement, evidence_policy, category, duration_days, required_proofs)`** — same signature, new behavior: an **empty** `evidence_policy` is now allowed and triggers AI policy design (the contract fills it via `suggest_evidence_policy`). A *non-empty* policy still enforces the 4–280 char bound.
- **`get_challenge` / `get_challenges_page`'s nested `evidence`** — each entry gains two fields: `appealed: bool` and `appeal_bond: str` (wei).
- **`get_evidence_page`** — same two new fields per entry.

### Added — storage (layout change → SCHEMA_VERSION 3)

- `Evidence` dataclass **+2 fields**: `appealed: bool`, `appeal_bond: u256` (appended; existing fields unmoved).
- New `reputation: TreeMap[Address, Reputation]` map.
- New `Reputation` dataclass: `challenges_created, challenges_won, proofs_verified, proofs_rejected, doubts_made, doubts_correct` (all `u32`).

### Added — constants

- `SCHEMA_VERSION = 3`
- `MIN_APPEAL_BOND = 10**17` (0.1 GEN)
- `CONVICTION_DAMPENER = 3`

---

### Feature 1 — Appeals

When a proof is **REJECTED**, the creator can appeal with a bond. A fresh
consensus round re-judges the evidence with an appeal notice prepended.

- **Flip → VERIFIED:** the proof counts (`verified_count += 1`), reputation moves rejected→verified, and the **bond is returned** to the appellant (credited to `claimable`).
- **Upheld:** the **bond is forfeited to the doubter pool**.
- One appeal per entry; bond `>= MIN_APPEAL_BOND`; creator-only.
- **Solvency:** the bond is held like any stake (`total_locked += bond` on deposit, then only moves between buckets), so conservation holds — proven by `test_appeal_conservation`.

### Feature 2 — AI-designed evidence policy

The contract's LLM proposes a concrete, anti-gaming evidence policy from the
statement. Used two ways: the **`suggest_evidence_policy` view** (preview, creates
nothing) and the **blank-policy autofill** branch in `create_challenge`.

### Feature 3 — Explain verdict

`explain_verdict` returns the referee's full reasoning for an *existing* verdict
via consensus, **without re-judging or mutating state** (verified by
`test_explain_does_not_mutate`). Output bounded to 600 chars.

### Feature 4 — Conviction rating

On-chain reputation derived from kept/broken/doubt history. Counters update in
`settle` (creator created/won; each distinct doubter made/correct),
`submit_evidence`, and `dispute_evidence`. `get_reputation` returns the raw
counters plus two **deterministic** 0–100 scores (no LLM):

```json
{
  "address": "0x…",
  "challenges_created": 0, "challenges_won": 0,
  "proofs_verified": 0, "proofs_rejected": 0,
  "doubts_made": 0, "doubts_correct": 0,
  "conviction_score": 0,   // 100·won/(created+3) — dampened so 1/1 ≠ 100
  "doubter_accuracy": 0     // 100·correct/(made+3)
}
```

---

### Frontend (`apps/web/lib/chain` + UI)

New `GrudgeClient` methods (implemented in both `genlayer.ts` and `mock.ts`):
`getReputation`, `explainVerdict`, `suggestPolicy`, `appealVerdict`.

New Zod schemas: `ReputationSchema`; `EvidenceEntrySchema` extended with
`appealed` + `appealBond`.

New hooks: `useReputation`, `useExplainVerdict`, `useSuggestPolicy`,
`useAppealVerdict`.

New / updated UI:
- `ConvictionBadge` — on profile, challenge creator, and each doubter.
- `ExplainVerdict` — "Explain this verdict" disclosure with a typewriter reveal.
- `AppealAction` — bond modal on rejected entries (creator only).
- Create wizard — "✨ Suggest a fair policy" button + rationale preview; the policy field may be left blank to let the AI design one.

### Tests

- Contract: **+18 Direct Mode cases** (41 total) — F4 (5), F3 (3), F2 (4), F1 (6), all run the real contract in-memory with the LLM mocked.
- Web: 35 vitest cases (mock client extended for all four features).
- Gates green: `ruff --select ALL`, `mypy --strict`, `genvm_lint`, `genvm-lint check`/`typecheck`, the wallet-lib guard.

---

## v1–v4 — hardened contract baseline

The contract before v5: paginated bounded views (no unbounded reads),
`total_locked` solvency bookkeeping + `_assert_solvent()`, the `claiming`
reentrancy guard on `claim()`, and deterministic time via
`gl.message_raw["datetime"]`. Public surface: `create_challenge`, `stake`,
`submit_evidence`, `dispute_evidence`, `settle`, `claim`, and the
`get_challenge*` / `get_*_page` / `get_claimable` / `get_solvency` views.
