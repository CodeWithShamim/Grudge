"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";

/**
 * Professional in-app documentation: a sticky scroll-spy sidebar beside
 * sectioned content, all in the GRUDGE design system. Static content (no chain
 * reads) so it renders instantly and is fully shareable.
 */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "why-genlayer", label: "Why GenLayer" },
  { id: "lifecycle", label: "Grudge lifecycle" },
  { id: "verdicts", label: "Verdicts & disputes" },
  { id: "payouts", label: "Stakes & payouts" },
  { id: "contract", label: "Contract reference" },
  { id: "faq", label: "FAQ" },
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
          GRUDGE is a social-accountability game on GenLayer. This guide covers the full loop —
          from opening a grudge to claiming a payout — and the validator consensus that referees
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
              consensus — never a human referee.
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
                ["Take a side", <>Anyone stakes <Term>believe</Term> or <Term>doubt</Term> — with an optional public taunt — through <Term>stake</Term>. The pools and odds move in real time.</>],
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

          <Section id="why-genlayer" title="Why GenLayer">
            <Lead>
              The referee is a <span className="text-paper">subjective judgment</span> — “does this
              evidence prove the promise?” — that no deterministic EVM contract or single oracle can
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
                ["SUCCEEDED", "Required proofs verified — promise kept.", "text-believe"],
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
          </Section>

          <Section id="payouts" title="Stakes & payouts">
            <Lead>GRUDGE is a binary market. The losing pool funds the winning side.</Lead>
            <ul className="ml-5 list-disc space-y-2 marker:text-gold">
              <li><span className="text-paper">Self-stake.</span> The creator’s GEN, sent with <Term>create_challenge</Term>, is the line they’re defending.</li>
              <li><span className="text-paper">Believers</span> stake that the promise will be kept; <span className="text-paper">doubters</span> stake that it won’t.</li>
              <li><span className="text-paper">Settlement.</span> On <Term>settle</Term>, the winning side splits the losing pool proportionally to their stake; winners withdraw with <Term>claim</Term>.</li>
              <li>A creator <span className="text-paper">cannot doubt their own grudge</span> — that’s just quitting.</li>
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
                    ["create_challenge(statement, evidence_policy, category, duration_days, required_proofs)", "write · payable", "Open a grudge; GEN sent is your self-stake."],
                    ["stake(challenge_id, side, taunt)", "write · payable", "Back (believe) or bet against (doubt), with an optional taunt."],
                    ["submit_evidence(challenge_id, evidence_text)", "write", "Submit a proof; validators reach consensus on the verdict."],
                    ["dispute_evidence(challenge_id, index, counter)", "write", "Challenge a VERIFIED entry; consensus re-judges."],
                    ["settle(challenge_id)", "write", "After the deadline, resolve and credit winners."],
                    ["claim()", "write", "Withdraw your settled winnings."],
                    ["get_challenge / get_open_challenges / get_challenges_page / get_claimable", "view", "Read-only chain queries."],
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

          <Section id="faq" title="FAQ">
            <div className="space-y-5">
              {[
                ["Who decides if I kept my promise?", <>No one person. The GenLayer validator set each runs the contract’s judging prompt and reaches consensus on the verdict. The result is on-chain and auditable.</>],
                ["What stops someone faking evidence?", <>The judging prompt evaluates the proof against the grudge’s evidence policy, and prompt-injection attempts are adjudicated by the same consensus and rejected. A verified entry can still be disputed.</>],
                ["Do I need GEN to play?", <>To create a grudge or stake, yes — those calls carry value. On GenLayer Studio the network is feeless, so reading and browsing cost nothing. Fund a Studio account with the simulator’s <Term>sim_fundAccount</Term> method.</>],
                ["Can I try it without a wallet?", <>Yes. The app ships a zero-config mock mode with seeded grudges so you can play the whole loop locally before connecting to a real network.</>],
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
