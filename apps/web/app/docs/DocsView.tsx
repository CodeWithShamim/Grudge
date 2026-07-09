"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { explorerAddressUrl, grudgeContractAddress } from "@/lib/chain/bradbury";
import { CodeBlock } from "./CodeBlock";

/**
 * Professional in-app documentation: a sticky scroll-spy sidebar beside
 * sectioned content, all in the GRUDGE design system. Static content (no chain
 * reads) so it renders instantly and is fully shareable.
 */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "signing-in", label: "Signing in" },
  { id: "why-genlayer", label: "Why GenLayer" },
  { id: "lifecycle", label: "Grudge lifecycle" },
  { id: "verdicts", label: "Verdicts & disputes" },
  { id: "payouts", label: "Stakes & payouts" },
  { id: "contract", label: "Contract reference" },
  { id: "roadmap", label: "Roadmap" },
  { id: "faq", label: "FAQ" },
] as const;

/**
 * Previous deployments, kept live so the team can inspect earlier transactions
 * at any time. Historical record — the ACTIVE contract always comes from
 * NEXT_PUBLIC_GRUDGE_CONTRACT_ADDRESS (see contracts/deployments.json).
 */
const PREVIOUS_DEPLOYMENTS = [
  {
    address: "0x503Cd4D2f88520c1f8a6455cC958199508789817",
    explorer:
      "https://explorer-studio.genlayer.com/address/0x503Cd4D2f88520c1f8a6455cC958199508789817",
    label: "GenLayer Studio · v6 (schema 4)",
    note: "anchored proof — optional (pre-mandatory-anchor)",
  },
  {
    address: "0xb9b501D7c617Cd26d93B61BA996fc67a6002379c",
    explorer:
      "https://explorer-studio.genlayer.com/address/0xb9b501D7c617Cd26d93B61BA996fc67a6002379c",
    label: "GenLayer Studio · v5 (schema 3)",
    note: "appeals · reputation · explain_verdict",
  },
] as const;

function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-line py-12 first:border-t-0 first:pt-0">
      <h2 className="display-statement mb-6 text-display-md text-paper">{title}</h2>
      <div className="space-y-4 font-sans text-[15px] leading-relaxed text-paper/80">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-mut">{children}</p>;
}

/** One deployed-contract row: address + explorer link. */
function AddressCard({
  label,
  address,
  href,
  note,
  current,
}: {
  label: string;
  address: string;
  href: string;
  note?: string;
  current?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border bg-ink-soft px-4 py-3 font-mono text-xs transition-colors",
        current ? "border-ink-line hover:border-gold/50" : "border-ink-line/60 opacity-80 hover:opacity-100 hover:border-mut/60",
      )}
      title={`View ${address} on the GenLayer explorer`}
    >
      <span className="flex items-center gap-2 uppercase tracking-widest text-mut">
        <span className={cn("h-1.5 w-1.5 rounded-full", current ? "bg-gold" : "bg-mut")} />
        {label}
      </span>
      <span className="text-paper">{address}</span>
      {note && <span className="text-mut">{note}</span>}
      <span className={current ? "text-gold" : "text-mut"}>on GenLayer Explorer ↗</span>
    </a>
  );
}

/** Current deployment + previous contracts (hidden in mock mode). */
function ContractAddressCard() {
  const address = grudgeContractAddress();
  if (!address) return null;
  return (
    <div className="space-y-2">
      <AddressCard label="Deployed contract" address={address} href={explorerAddressUrl(address)} current />
      {PREVIOUS_DEPLOYMENTS.map((d) => (
        <AddressCard key={d.address} label="Previous" address={d.address} href={d.explorer} note={d.note} />
      ))}
      <p className="font-sans text-xs text-mut">
        Previous contracts stay live on-chain — open one in the explorer to re-check any earlier
        transaction. The app itself always talks to the current contract.
      </p>
    </div>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink-raised px-1.5 py-0.5 font-mono text-[13px] text-gold">{children}</code>;
}

export function DocsView() {
  const active = useScrollSpy(SECTIONS.map((s) => s.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* page header */}
      <header className="mb-12 border-b border-ink-line pb-10">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">documentation</p>
        <h1 className="display-statement max-w-3xl text-display-lg text-paper">
          Stake on your word. Let consensus settle it.
        </h1>
        <p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-mut">
          GRUDGE is a social-accountability game on GenLayer. This guide covers the full loop - from opening a grudge to claiming a payout - and the validator consensus that referees
          every verdict.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="rounded-control bg-gold px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e2 transition-transform hover:bg-gold/90 active:scale-[0.97]"
          >
            Hold a grudge
          </Link>
          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-ink-line px-6 py-2.5 font-mono text-sm uppercase tracking-wider text-mut transition-colors hover:border-mut/60 hover:text-paper"
          >
            GenLayer docs ↗
          </a>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[200px_1fr]">
        {/* sticky scroll-spy sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Docs sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "block border-l-2 py-1.5 pl-4 font-mono text-xs uppercase tracking-widest transition-colors",
                  active === s.id
                    ? "border-gold text-paper"
                    : "border-ink-line text-mut hover:border-mut/60 hover:text-paper",
                )}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* content */}
        <main className="min-w-0">
          <Section id="overview" title="Overview">
            <Lead>
              GRUDGE turns a personal commitment into a public, on-chain market. You put GEN behind a
              promise; the crowd bets for or against you; and the truth is settled by validator
              consensus - never a human referee.
            </Lead>
            <ul className="ml-5 list-disc space-y-2 marker:text-gold">
              <li><span className="text-paper">Public commitment.</span> Every grudge, stake, taunt, and verdict is recorded on-chain and visible to anyone.</li>
              <li><span className="text-paper">Real skin in the game.</span> Believers and doubters stake GEN. The winning side takes the pool.</li>
              <li><span className="text-paper">Trustless refereeing.</span> A GenLayer Intelligent Contract runs the judging prompt inside consensus.</li>
            </ul>
          </Section>

          <Section id="how-it-works" title="How it works">
            <Lead>The loop has four moves. Each is a single on-chain transaction.</Lead>
            <ol className="space-y-4">
              {[
                ["Open a grudge", <>Write a concrete, time-boxed claim and an evidence policy, then back it with a GEN self-stake via <Term>create_challenge</Term>.</>],
                ["Take a side", <>Anyone stakes <Term>believe</Term> or <Term>doubt</Term> - with an optional public taunt - through <Term>stake</Term>. The pools and odds move in real time.</>],
                ["Submit evidence", <>Post a proof with <Term>submit_evidence</Term>. Validators run the judging prompt and reach consensus on the verdict.</>],
                ["Settle & claim", <>After the deadline, anyone calls <Term>settle</Term>; the contract credits the winners, who withdraw with <Term>claim</Term>.</>],
              ].map(([title, body], i) => (
                <li key={i} className="flex gap-4 rounded-card border border-ink-line bg-ink-soft p-4">
                  <span className="font-display text-2xl italic leading-none text-gold opacity-50">{`0${i + 1}`}</span>
                  <div>
                    <p className="font-display uppercase italic tracking-wide text-paper">{title}</p>
                    <p className="mt-1 text-sm text-mut">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="signing-in" title="Signing in">
            <Lead>
              No wallet extension, no seed phrase, no transaction popups. You sign in with an
              email and a one-time code — and an on-chain wallet is created for you automatically.
            </Lead>
            <ul className="ml-5 list-disc space-y-2 marker:text-gold">
              <li><span className="text-paper">Email login.</span> Enter your email, then the code we send you. That’s it — no app to install.</li>
              <li><span className="text-paper">Embedded wallet.</span> On first login an embedded wallet is provisioned and its key is securely custodied, so every action signs <span className="text-paper">silently</span> — no confirmation dialog, no fee prompt.</li>
              <li><span className="text-paper">Funded to start.</span> On GenLayer Studio your wallet is auto-funded with test GEN the first time it’s empty, so you can act within seconds.</li>
              <li><span className="text-paper">You stay in control.</span> Export your wallet any time from the account menu — you’re never locked in.</li>
            </ul>
            <p className="text-mut">
              Browsing the ledger needs no account; only actions that put GEN on-chain (create,
              stake, evidence, dispute, settle, claim) require signing in.
            </p>
          </Section>

          <Section id="why-genlayer" title="Why GenLayer">
            <Lead>
              The referee is a <span className="text-paper">subjective judgment</span> - “does this
              evidence prove the promise?” - that no deterministic EVM contract or single oracle can
              make trustlessly.
            </Lead>
            <p>
              GenLayer Intelligent Contracts run that judgment <span className="text-paper">inside consensus</span>.
              The validator set each executes the same judging prompt and agrees on the verdict, so the
              outcome is a consensus artifact rather than one model’s opinion. Prompt-injection attempts
              embedded in evidence are adjudicated by that same consensus and auto-<span className="text-doubt">REJECTED</span>.
            </p>
            <CodeBlock filename="contracts/grudge.py">{`# the verdict is produced inside validator consensus
result = gl.eq_principle_prompt_comparative(
    task=JUDGE_PROMPT,         # same prompt every validator runs
    criteria="verdict enum + reason match",
)`}</CodeBlock>
          </Section>

          <Section id="lifecycle" title="Grudge lifecycle">
            <Lead>A grudge moves through four states. The chain is the single source of truth.</Lead>
            <CodeBlock filename="state machine">{`ACTIVE ───────────────▶ SUCCEEDED   (verified_count >= required_proofs)
   │                        │
   │ deadline passes        │ settle()
   └──────────────────────▶ FAILED ──▶ SETTLED ──▶ claim()`}</CodeBlock>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["ACTIVE", "Open for stakes and evidence.", "text-gold"],
                ["SUCCEEDED", "Required proofs verified - promise kept.", "text-believe"],
                ["FAILED", "Deadline hit without enough proof.", "text-doubt"],
                ["SETTLED", "Resolved; winnings credited to claim.", "text-mut"],
              ].map(([s, d, c]) => (
                <div key={s} className="rounded-card border border-ink-line bg-ink-soft p-4">
                  <p className={cn("font-mono text-xs font-bold uppercase tracking-widest", c)}>{s}</p>
                  <p className="mt-1 text-sm text-mut">{d}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="verdicts" title="Verdicts & disputes">
            <Lead>Every evidence submission returns one of three verdicts, decided by consensus.</Lead>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { v: "VERIFIED", d: "The proof holds. Counts toward required proofs.", border: "border-believe/40", text: "text-believe" },
                { v: "SUSPICIOUS", d: "Inconclusive. Does not count; resubmit.", border: "border-gold/40", text: "text-gold" },
                { v: "REJECTED", d: "Fails the policy (or is an injection attempt).", border: "border-doubt/40", text: "text-doubt" },
              ].map(({ v, d, border, text }) => (
                <div key={v} className={cn("rounded-card border bg-ink-soft p-4", border)}>
                  <p className={cn("font-mono text-xs font-bold uppercase tracking-widest", text)}>{v}</p>
                  <p className="mt-2 text-sm text-mut">{d}</p>
                </div>
              ))}
            </div>
            <p>
              A <Term>VERIFIED</Term> entry can be challenged with <Term>dispute_evidence</Term>: the
              disputer submits counter-evidence and consensus re-judges. If the dispute holds, the
              verdict flips.
            </p>
            <p>
              A <Term>REJECTED</Term> proof can be <span className="text-paper">appealed</span> by the
              creator with <Term>appeal_verdict</Term>, which carries a bond. A fresh consensus round
              re-judges: flip to <Term>VERIFIED</Term> and the bond comes back (and the proof counts);
              upheld and the bond is forfeited to the doubter pool. One appeal per entry.
            </p>
            <p className="text-mut">
              Curious why a verdict landed the way it did? <Term>explain_verdict</Term> returns the
              referee&rsquo;s full reasoning via consensus — without changing the outcome.
            </p>
          </Section>

          <Section id="payouts" title="Stakes & payouts">
            <Lead>GRUDGE is a binary market. The losing pool funds the winning side.</Lead>
            <ul className="ml-5 list-disc space-y-2 marker:text-gold">
              <li><span className="text-paper">Self-stake.</span> The creator’s GEN, sent with <Term>create_challenge</Term>, is the line they’re defending.</li>
              <li><span className="text-paper">Believers</span> stake that the promise will be kept; <span className="text-paper">doubters</span> stake that it won’t.</li>
              <li><span className="text-paper">Settlement.</span> On <Term>settle</Term>, the winning side splits the losing pool proportionally to their stake; winners withdraw with <Term>claim</Term>.</li>
              <li>A creator <span className="text-paper">cannot doubt their own grudge</span> - that’s just quitting.</li>
            </ul>
            <p className="text-mut">
              Amounts are denominated in GEN (18 decimals). On GenLayer Studio the network is feeless,
              so only value-carrying calls (creating or staking) require a funded balance.
            </p>
          </Section>

          <Section id="contract" title="Contract reference">
            <Lead>
              Every chain access in the app goes through one adapter; the public methods below are the
              full surface of <Term>contracts/grudge.py</Term>.
            </Lead>
            <ContractAddressCard />
            <div className="overflow-x-auto rounded-card border border-ink-line">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-line bg-ink-soft font-mono text-[11px] uppercase tracking-widest text-mut">
                    <th className="px-4 py-3 font-normal">Method</th>
                    <th className="px-4 py-3 font-normal">Kind</th>
                    <th className="px-4 py-3 font-normal">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-line">
                  {[
                    ["create_challenge(statement, evidence_policy, category, duration_days, required_proofs)", "write · payable", "Open a grudge; GEN sent is your self-stake. A blank policy is AI-designed."],
                    ["stake(challenge_id, side, taunt)", "write · payable", "Back (believe) or bet against (doubt), with an optional taunt."],
                    ["submit_evidence(challenge_id, evidence_text)", "write", "Submit a proof; validators reach consensus on the verdict."],
                    ["dispute_evidence(challenge_id, index, counter)", "write", "Challenge a VERIFIED entry; consensus re-judges."],
                    ["appeal_verdict(challenge_id, evidence_index)", "write · payable", "Appeal a REJECTED proof with a bond; bond returns on flip, else forfeited."],
                    ["settle(challenge_id)", "write", "After the deadline, resolve and credit winners."],
                    ["claim()", "write", "Withdraw your settled winnings."],
                    ["get_challenges_page(offset, limit)", "view", "Paginated summaries — the only list read (bounded, no nested arrays)."],
                    ["get_challenge / get_challenge_summary", "view", "Full or bounded single-challenge read."],
                    ["get_stakes_page / get_evidence_page", "view", "Paginate one challenge's stakes / evidence."],
                    ["get_claimable(address) / get_solvency()", "view", "Withdrawable balance · contract liability invariant."],
                    ["get_reputation(address)", "view", "Conviction rating: kept/broken counters + deterministic 0–100 scores."],
                    ["explain_verdict(challenge_id, evidence_index)", "view", "The referee's reasoning for a verdict (consensus, never re-judges)."],
                    ["suggest_evidence_policy(statement)", "view", "Preview an AI-designed evidence policy for a statement."],
                  ].map(([m, k, p]) => (
                    <tr key={m} className="align-top">
                      <td className="px-4 py-3 font-mono text-[12px] text-paper/90">{m}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-gold">{k}</td>
                      <td className="px-4 py-3 text-mut">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="roadmap" title="Roadmap">
            <Lead>
              Where GRUDGE is headed. Shipped work is live on the current contract; the rest is in
              flight or planned.
            </Lead>
            <div className="space-y-3">
              {[
                {
                  phase: "Shipped",
                  tone: "text-believe",
                  items: [
                    "Hardened contract: bounded views, solvency bookkeeping, reentrancy-guarded claim (v1–v4)",
                    "Appeals with bonds, AI-designed evidence policies, explain_verdict, conviction ratings (v5)",
                    "Anchored Proof: registered proof sources, on-chain ownership verification, host-gated evidence, proof-period time windows (v6)",
                  ],
                },
                {
                  phase: "Next",
                  tone: "text-gold",
                  items: [
                    "Anchored-challenge UI polish: badge states, verification error recovery, explorer deep-links",
                    "Settled-challenge payout breakdown and claim history",
                    "Multi-anchor support — more than one proof source per grudge",
                    "Public testnet (Asimov) deployment",
                  ],
                },
                {
                  phase: "Later",
                  tone: "text-mut",
                  items: [
                    "Lightweight indexer for profile and leaderboard reads",
                    "Notifications: proof-period reminders and settle alerts",
                    "Challenge templates and social share cards",
                    "Mainnet deployment with real-GEN economics review",
                  ],
                },
              ].map(({ phase, tone, items }) => (
                <div key={phase} className="rounded-card border border-ink-line bg-ink-soft p-5">
                  <p className={cn("font-mono text-xs font-bold uppercase tracking-widest", tone)}>{phase}</p>
                  <ul className="mt-3 ml-5 list-disc space-y-1.5 text-sm text-mut marker:text-gold">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section id="faq" title="FAQ">
            <div className="space-y-5">
              {[
                ["How do I sign in?", <>With your email. Enter it, type the one-time code we send you, and an on-chain wallet is created for you automatically — no extension, no seed phrase.</>],
                ["Do I have to confirm every transaction?", <>No. Your embedded wallet signs silently, so creating, staking, submitting evidence, settling, and claiming all happen without a popup or fee prompt.</>],
                ["Who decides if I kept my promise?", <>No one person. The GenLayer validator set each runs the contract’s judging prompt and reaches consensus on the verdict. The result is on-chain and auditable.</>],
                ["What stops someone faking evidence?", <>The judging prompt evaluates the proof against the grudge’s evidence policy, and prompt-injection attempts are adjudicated by the same consensus and rejected. A verified entry can still be disputed.</>],
                ["What if I think a rejection was wrong?", <>Appeal it. <Term>appeal_verdict</Term> bonds some GEN and triggers a fresh consensus round. If the panel flips to VERIFIED, your bond returns and the proof counts; if it’s upheld, the bond goes to the doubters. One appeal per proof.</>],
                ["What is a conviction rating?", <>An on-chain reputation from your kept-vs-broken history (and, for doubters, how often you were right). It’s computed deterministically with a volume dampener, so a high score must be earned over many grudges — shown next to creators and doubters everywhere.</>],
                ["Do I need GEN to play?", <>To create a grudge or stake, yes - those calls carry value. On GenLayer Studio your wallet is auto-funded with test GEN, so you start ready. Reading and browsing the ledger cost nothing and need no sign-in.</>],
                ["Can I try it without signing in?", <>Yes. The app ships a zero-config mock mode with seeded grudges, so you can play the whole loop locally before connecting to a real network.</>],
              ].map(([q, a], i) => (
                <div key={i} className="rounded-card border border-ink-line bg-ink-soft p-5">
                  <p className="font-display uppercase italic tracking-wide text-paper">{q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-mut">{a}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="mt-12 flex flex-col items-start gap-3 border-t border-ink-line pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-sm text-mut">Ready to put money on yourself?</p>
            <Link
              href="/create"
              className="rounded-control bg-gold px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e2 transition-transform hover:bg-gold/90 active:scale-[0.97]"
            >
              Hold a grudge →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
