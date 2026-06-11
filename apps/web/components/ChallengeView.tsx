"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { fadeRise, staggerList } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useChallenge, useSettle, useViewer } from "@/lib/chain/hooks";
import { deadlinePressure, oddsLine, rejectionBanner, streakNudge } from "@/lib/psychology/copy";
import { shortAddress } from "@/lib/utils";
import type { SettleResult, Side } from "@/lib/chain/types";
import { TugOfWar } from "./TugOfWar";
import { Countdown } from "./Countdown";
import { ProofGrid } from "./ProofGrid";
import { DoubterBench } from "./DoubterBench";
import { EvidenceTribunal } from "./EvidenceTribunal";
import { StakePanel } from "./StakePanel";
import { SettleTakeover } from "./SettleTakeover";
import { Button } from "./ui/Button";
import { GenAmount } from "./ui/GenAmount";

export function ChallengeView({ id }: { id: string }) {
  const { data: challenge, isLoading, isError, refetch } = useChallenge(id);
  const { address } = useViewer();
  const settle = useSettle(id);
  const search = useSearchParams();
  const [stakeOpen, setStakeOpen] = useState(search.get("side") !== null);
  const [stakeSide, setStakeSide] = useState<Side>(search.get("side") === "doubt" ? "doubt" : "believe");
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const { pick } = useReducedMotionSafe();

  if (isLoading) return <ChallengeSkeleton />;
  if (isError || !challenge) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="mb-4 text-mut">Couldn&apos;t read this grudge from the chain.</p>
        <Button variant="ghost" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const isCreator = challenge.creator.toLowerCase() === address.toLowerCase();
  const lastEvidence = challenge.evidence[challenge.evidence.length - 1];
  const deadlinePassed = Date.now() >= challenge.endsAt;
  const canSettle = challenge.status === "ACTIVE" && deadlinePassed;
  const openStake = (side: Side) => {
    setStakeSide(side);
    setStakeOpen(true);
  };

  return (
    <motion.div variants={pick(staggerList)} initial="hidden" animate="visible" className="mx-auto max-w-4xl px-4 py-10">
      {/* rejection banner — blood in the water */}
      {lastEvidence?.verdict === "REJECTED" && challenge.status === "ACTIVE" && (
        <motion.div
          variants={pick(fadeRise)}
          className="mb-6 rounded-card border border-doubt/50 bg-doubt/10 px-4 py-3 font-mono text-xs uppercase tracking-wider text-doubt"
          role="alert"
        >
          {rejectionBanner(shortAddress(challenge.creator))}
        </motion.div>
      )}

      {/* ticket header (shared element with the feed card) */}
      <motion.header variants={pick(fadeRise)} className="grain relative mb-8 rounded-card bg-ink-soft p-6 shadow-e3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-mut">
          <span>
            grudge #{challenge.id} · {challenge.category} · by {shortAddress(challenge.creator)}
            {isCreator && " (you)"}
          </span>
          <span>
            self-stake <GenAmount value={challenge.selfStake} className="text-gold" />
          </span>
        </div>
        <h1 className="display-statement mb-3 text-display-lg text-paper" data-shared={`statement-${challenge.id}`}>
          {challenge.statement}
        </h1>
        <p className="mb-1 font-mono text-sm text-gold">{oddsLine(challenge)}</p>
        <p className="mb-5 text-xs text-mut">Policy: {challenge.evidencePolicy}</p>

        <TugOfWar believe={challenge.believerPool + challenge.selfStake} doubt={challenge.doubterPool} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Countdown endsAt={challenge.endsAt} className="text-lg" />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mut">
              {deadlinePressure(challenge.endsAt - Date.now())}
            </p>
          </div>
          {challenge.status === "ACTIVE" && !deadlinePassed && (
            <div className="flex gap-2">
              <Button variant="believe" onClick={() => openStake("believe")}>
                Back them
              </Button>
              {!isCreator && (
                <Button variant="doubt" onClick={() => openStake("doubt")}>
                  Doubt them
                </Button>
              )}
            </div>
          )}
          {canSettle && (
            <Button
              variant="primary"
              loading={settle.isPending}
              onClick={() => settle.mutate(undefined, { onSuccess: setSettleResult })}
            >
              Settle it
            </Button>
          )}
        </div>
        {isCreator && challenge.status === "ACTIVE" && (
          <p className="mt-4 border-t border-ink-line pt-3 font-mono text-xs text-gold">{streakNudge(challenge)}</p>
        )}
      </motion.header>

      {/* proof grid */}
      <motion.section variants={pick(fadeRise)} className="mb-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-mut">
          Proof ledger · {challenge.verifiedCount}/{challenge.requiredProofs} verified
        </h2>
        <ProofGrid challenge={challenge} />
      </motion.section>

      {/* tribunal */}
      <motion.section variants={pick(fadeRise)} className="mb-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-mut">The tribunal</h2>
        <EvidenceTribunal challenge={challenge} />
      </motion.section>

      {/* doubters bench */}
      <motion.section variants={pick(fadeRise)}>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-mut">The doubters&apos; bench</h2>
        <DoubterBench challenge={challenge} />
      </motion.section>

      <StakePanel challenge={challenge} open={stakeOpen} initialSide={stakeSide} onClose={() => setStakeOpen(false)} />
      {settleResult && (
        <SettleTakeover challenge={challenge} result={settleResult} onDismiss={() => setSettleResult(null)} />
      )}
    </motion.div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-card bg-ink-soft p-6 shadow-e3">
        <div className="skeleton mb-3 h-4 w-48" />
        <div className="skeleton mb-4 h-10 w-4/5" />
        <div className="skeleton mb-5 h-4 w-2/5" />
        <div className="skeleton h-8 w-full" />
        <div className="mt-5 flex justify-between">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-10 w-48" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="skeleton aspect-square" />
        ))}
      </div>
    </div>
  );
}
