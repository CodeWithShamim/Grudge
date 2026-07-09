# Changelog

All notable changes to the GRUDGE contract and the `lib/chain` adapter it backs.
Dates are when the work landed; the contract is versioned by its on-chain
storage layout (`SCHEMA_VERSION`).

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
