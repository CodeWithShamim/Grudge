"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { sharedAxis } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { getGrudgeClient } from "@/lib/chain/client";
import { useCreateChallenge } from "@/lib/chain/hooks";
import { MIN_STAKE_GEN, type Screening } from "@/lib/chain/types";
import { Button } from "@/components/ui/Button";

const CATEGORIES = ["fitness", "habits", "career", "creator", "money", "general"] as const;

const StepOneSchema = z.string().min(12, "Too short to be a real promise.");

export default function CreatePage() {
  const router = useRouter();
  const create = useCreateChallenge();
  const { prefersReduced } = useReducedMotionSafe();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [statement, setStatement] = useState("");
  const [screening, setScreening] = useState<Screening | null>(null);
  const [screeningPending, setScreeningPending] = useState(false);
  const [policy, setPolicy] = useState("");
  const [category, setCategory] = useState<string>("habits");
  const [durationDays, setDurationDays] = useState(30);
  const [requiredProofs, setRequiredProofs] = useState(24);
  const [selfStake, setSelfStake] = useState(1);

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const screen = async () => {
    setScreeningPending(true);
    try {
      const client = await getGrudgeClient();
      setScreening(await client.screenStatement(statement));
    } finally {
      setScreeningPending(false);
    }
  };

  const submit = () => {
    create.mutate(
      { statement, evidencePolicy: policy, category, durationDays, requiredProofs, selfStake },
      { onSuccess: ({ id }) => router.push(`/challenge/${id}`) },
    );
  };

  const variants = prefersReduced
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : sharedAxis(direction);

  const stepOneValid = StepOneSchema.safeParse(statement).success && screening?.accepted === true;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="display-statement text-display-lg text-paper">Hold a grudge</h1>
        <p className="mt-2 text-sm text-mut">Put money on yourself. Make it public. Let the validators referee.</p>
      </header>

      {/* step indicator */}
      <div className="mb-8 flex gap-2" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((s) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full", s <= step ? "bg-gold" : "bg-ink-raised")} />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 0 && (
          <motion.section key="s0" variants={variants} initial="enter" animate="center" exit="exit">
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mut" htmlFor="statement">
              The promise — concrete, measurable, time-boxed
            </label>
            <textarea
              id="statement"
              value={statement}
              onChange={(e) => {
                setStatement(e.target.value);
                setScreening(null);
              }}
              rows={3}
              placeholder="I will run 5km every day for 30 days"
              className="mb-4 w-full resize-none rounded-control border border-ink-line bg-ink-soft px-4 py-3 text-lg text-paper placeholder:text-mut/50 focus:border-gold focus:outline-none"
            />

            {screening && (
              <div
                className={cn(
                  "mb-4 rounded-card border p-4 text-sm",
                  screening.accepted ? "border-believe/50 bg-believe/10" : "border-doubt/50 bg-doubt/10",
                )}
                role="status"
              >
                <p className={cn("font-mono text-xs font-bold uppercase tracking-widest", screening.accepted ? "text-believe" : "text-doubt")}>
                  {screening.accepted ? "Screened: accepted" : "Screened: rejected"}
                </p>
                <p className="mt-1 text-paper/90">{screening.reason}</p>
                {!screening.accepted && screening.suggestedRewrite && (
                  <button
                    onClick={() => {
                      setStatement(screening.suggestedRewrite ?? "");
                      setScreening(null);
                    }}
                    className="mt-2 text-left font-mono text-xs text-gold hover:underline"
                  >
                    Use rewrite: &ldquo;{screening.suggestedRewrite}&rdquo; →
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => void screen()} loading={screeningPending} disabled={statement.trim().length < 12}>
                Screen it
              </Button>
              <Button onClick={() => go(1)} disabled={!stepOneValid}>
                Next: the rules →
              </Button>
            </div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section key="s1" variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mut" htmlFor="policy">
                Evidence policy — what counts as proof?
              </label>
              <textarea
                id="policy"
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                rows={2}
                placeholder="Strava screenshot or activity link per day, distance ≥ 5.0km"
                className="w-full resize-none rounded-control border border-ink-line bg-ink-soft px-4 py-3 text-sm text-paper placeholder:text-mut/50 focus:border-gold focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Duration (days)" value={durationDays} onChange={setDurationDays} min={3} max={365} />
              <NumberField label="Required proofs" value={requiredProofs} onChange={setRequiredProofs} min={1} max={365} />
            </div>
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-mut">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={cn(
                      "rounded-chip px-3 py-1 font-mono text-[11px] uppercase tracking-widest",
                      category === c ? "bg-gold text-ink" : "bg-ink-raised text-mut hover:text-paper",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => go(0)}>
                ← Back
              </Button>
              <Button onClick={() => go(2)} disabled={policy.trim().length < 10}>
                Next: the stake →
              </Button>
            </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section key="s2" variants={variants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <NumberField
              label="Your self-stake (GEN) — you lose it if you fold (min 0.5)"
              value={selfStake}
              onChange={setSelfStake}
              min={MIN_STAKE_GEN}
              max={100000}
              step={0.5}
            />
            <div className="grain relative rounded-card bg-ink-soft p-5 shadow-e2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-mut">the ticket you&apos;re signing</p>
              <p className="display-statement mt-2 text-display-md text-paper">{statement}</p>
              <p className="mt-2 text-xs text-mut">
                {policy} · {durationDays} days · {requiredProofs} proofs required · {selfStake} GEN self-stake
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => go(1)}>
                ← Back
              </Button>
              <Button size="lg" loading={create.isPending} onClick={submit}>
                Stake {selfStake} GEN on myself
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mut">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-full rounded-control border border-ink-line bg-ink-soft px-4 py-3 font-mono text-sm tabular-nums text-paper focus:border-gold focus:outline-none"
      />
    </div>
  );
}
