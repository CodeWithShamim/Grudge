"use client";

import { useState } from "react";
import { TugOfWar } from "@/components/TugOfWar";
import { VerdictStamp } from "@/components/VerdictStamp";
import { ValidatorArc } from "@/components/ValidatorArc";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/Button";
import { GenAmount } from "@/components/ui/GenAmount";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketCard, TicketCardSkeleton } from "@/components/TicketCard";
import { ProofGrid } from "@/components/ProofGrid";
import { DoubterBench } from "@/components/DoubterBench";
import { seedChallenges } from "@/lib/chain/mock";
import type { Verdict } from "@/lib/chain/types";

/**
 * The design-system + motion gallery: every signature component and motion
 * moment, demoable in isolation. This page is the acceptance harness for the
 * MOTION DESIGN SYSTEM spec.
 */
export default function ComponentGallery() {
  const [believe, setBelieve] = useState(260);
  const [doubt, setDoubt] = useState(350);
  const [verdict, setVerdict] = useState<Verdict>("VERIFIED");
  const [stampKey, setStampKey] = useState(0);
  const [arcKey, setArcKey] = useState(0);
  const demo = seedChallenges(Date.now())[0]!;

  return (
    <div className="mx-auto max-w-4xl space-y-16 px-4 py-12">
      <h1 className="display-statement text-display-lg text-paper">Component gallery</h1>

      <Section title="#1 Tug-of-war (heavy spring, drifting stripes, lead pulse)">
        <TugOfWar believe={believe} doubt={doubt} />
        <div className="mt-4 flex gap-2">
          <Button variant="believe" size="sm" onClick={() => setBelieve((b) => b + 100)}>
            +100 believe
          </Button>
          <Button variant="doubt" size="sm" onClick={() => setDoubt((d) => d + 100)}>
            +100 doubt
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setBelieve(260); setDoubt(350); }}>
            reset
          </Button>
        </div>
      </Section>

      <Section title="#2 VerdictStamp (rubber-stamp physics, shake on REJECTED, typed consensus line)">
        <div className="flex flex-wrap items-center gap-6">
          <VerdictStamp key={stampKey} verdict={verdict} txHash="0xdeadbeefcafe1234" />
        </div>
        <div className="mt-4 flex gap-2">
          {(["VERIFIED", "SUSPICIOUS", "REJECTED"] as const).map((v) => (
            <Button
              key={v}
              variant="ghost"
              size="sm"
              onClick={() => {
                setVerdict(v);
                setStampKey((k) => k + 1);
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="#3 Validators voting… (arc, thinking pulse, staggered flips)">
        <ValidatorArc key={arcKey} verdict={verdict} thinkingMs={1500} />
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setArcKey((k) => k + 1)}>
            replay
          </Button>
        </div>
      </Section>

      <Section title="#4 Number flow (odometer pools & countdown)">
        <div className="flex flex-wrap items-center gap-8">
          <GenAmount value={believe + doubt} className="text-3xl text-gold" />
          <Countdown endsAt={Date.now() + 90_061_000} className="text-2xl" />
        </div>
      </Section>

      <Section title="TicketCard (pointer tilt + specular) & skeleton">
        <div className="grid gap-4 sm:grid-cols-2">
          <TicketCard challenge={demo} />
          <TicketCardSkeleton />
        </div>
      </Section>

      <Section title="ProofGrid (breathing today-cell) & DoubterBench (taunt pop)">
        <ProofGrid challenge={demo} />
        <div className="mt-6">
          <DoubterBench challenge={demo} />
        </div>
      </Section>

      <Section title="Buttons (press 0.97 + spring) — all states">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="believe">Believe</Button>
          <Button variant="doubt">Doubt</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="paper">Paper</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState line="No grudges yet. Start one — or doubt someone braver." />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grain relative rounded-card bg-ink-soft p-6 shadow-e2">
      <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-mut">{title}</h2>
      {children}
    </section>
  );
}
