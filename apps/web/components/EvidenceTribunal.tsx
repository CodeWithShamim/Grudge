"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DUR, EASE } from "@/lib/motion/tokens";
import { useDisputeEvidence, useSubmitEvidence, useViewer } from "@/lib/chain/hooks";
import { EMPTY_STATES } from "@/lib/psychology/copy";
import type { Challenge, EvidenceEntry, Verdict } from "@/lib/chain/types";
import { Button } from "./ui/Button";
import { ValidatorArc } from "./ValidatorArc";
import { VerdictStamp } from "./VerdictStamp";
import { EmptyState } from "./ui/EmptyState";

type TribunalPhase =
  | { name: "idle" }
  | { name: "voting"; verdict: Verdict; txHash?: string }
  | { name: "stamped"; verdict: Verdict; txHash?: string };

const VERDICT_TEXT: Record<Verdict, string> = {
  VERIFIED: "text-believe",
  SUSPICIOUS: "text-gold",
  REJECTED: "text-doubt",
};

/**
 * The evidence tribunal: textarea -> "Validators voting…" arc (signature #3)
 * -> VerdictStamp slam (signature #2). The arc plays while the judge call is
 * in flight; the stamp lands once consensus is in.
 */
export function EvidenceTribunal({ challenge, className }: { challenge: Challenge; className?: string }) {
  const { address } = useViewer();
  const isCreator = challenge.creator.toLowerCase() === address.toLowerCase();
  const submit = useSubmitEvidence(challenge.id);
  const dispute = useDisputeEvidence(challenge.id);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<TribunalPhase>({ name: "idle" });
  const [disputeFor, setDisputeFor] = useState<number | null>(null);
  const [counterText, setCounterText] = useState("");

  const onSubmit = () => {
    if (text.trim().length === 0) return;
    submit.mutate(text, {
      onSuccess: ({ entry, txHash }) => {
        setPhase({ name: "voting", verdict: entry.verdict, txHash });
        setText("");
      },
    });
  };

  const onDispute = (index: number) => {
    if (counterText.trim().length === 0) return;
    dispute.mutate({ evidenceIndex: index, counterEvidence: counterText });
    setDisputeFor(null);
    setCounterText("");
  };

  return (
    <section className={cn("space-y-6", className)} aria-label="Evidence tribunal">
      {/* submission box — challenger only */}
      {isCreator && challenge.status === "ACTIVE" && phase.name === "idle" && (
        <div className="grain relative rounded-card bg-ink-soft p-5 shadow-e2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mut">
            Submit today&apos;s proof · judged by validator consensus · injection attempts are auto-rejected
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={`Evidence per policy: ${challenge.evidencePolicy}`}
            className="mb-3 w-full resize-none rounded-control border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-mut/60 focus:border-gold focus:outline-none"
          />
          <Button onClick={onSubmit} loading={submit.isPending} disabled={text.trim().length === 0}>
            Face the validators
          </Button>
        </div>
      )}

      {/* signature #3 + #2: voting arc, then the stamp */}
      <AnimatePresence mode="wait">
        {phase.name === "voting" && (
          <motion.div
            key="voting"
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            className="flex justify-center rounded-card bg-ink-soft py-10 shadow-e2"
          >
            <ValidatorArc
              verdict={phase.verdict}
              onComplete={() => setPhase({ name: "stamped", verdict: phase.verdict, txHash: phase.txHash })}
            />
          </motion.div>
        )}
        {phase.name === "stamped" && (
          <motion.div
            key="stamped"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DUR.fast }}
            className="flex flex-col items-center gap-4 rounded-card bg-ink-soft py-10 shadow-e2"
          >
            <VerdictStamp verdict={phase.verdict} consensusLine="5/5 nodes agree" txHash={phase.txHash} />
            <Button variant="ghost" size="sm" onClick={() => setPhase({ name: "idle" })}>
              Back to the ledger
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* evidence log */}
      {challenge.evidence.length === 0 && phase.name === "idle" ? (
        <EmptyState line={EMPTY_STATES.evidence} className="py-8" />
      ) : (
        <ul className="space-y-2" aria-label="Evidence log">
          {[...challenge.evidence].reverse().map((entry, revIdx) => {
            const index = challenge.evidence.length - 1 - revIdx;
            return (
              <EvidenceRow
                key={index}
                entry={entry}
                disputing={disputeFor === index}
                canDispute={!isCreator && entry.verdict === "VERIFIED" && !entry.disputed && challenge.status === "ACTIVE"}
                counterText={counterText}
                onCounterText={setCounterText}
                onOpenDispute={() => setDisputeFor(index)}
                onCancelDispute={() => setDisputeFor(null)}
                onCommitDispute={() => onDispute(index)}
                disputePending={dispute.isPending}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EvidenceRow({
  entry,
  disputing,
  canDispute,
  counterText,
  onCounterText,
  onOpenDispute,
  onCancelDispute,
  onCommitDispute,
  disputePending,
}: {
  entry: EvidenceEntry;
  disputing: boolean;
  canDispute: boolean;
  counterText: string;
  onCounterText: (s: string) => void;
  onOpenDispute: () => void;
  onCancelDispute: () => void;
  onCommitDispute: () => void;
  disputePending: boolean;
}) {
  return (
    <li className="rounded-card bg-ink-soft p-4 shadow-e1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mut">
            Day {entry.day}
            {entry.disputed && " · disputed"}
          </p>
          <p className="truncate text-sm text-paper/90">{entry.summary}</p>
          <p className="mt-1 text-xs text-mut">{entry.reason}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={cn("font-mono text-xs font-bold", VERDICT_TEXT[entry.verdict])}>{entry.verdict}</span>
          <p className="font-mono text-[10px] text-mut">{entry.confidence}%</p>
        </div>
      </div>
      {canDispute && !disputing && (
        <button
          onClick={onOpenDispute}
          className="mt-2 font-mono text-[11px] uppercase tracking-widest text-doubt hover:underline"
        >
          Dispute this →
        </button>
      )}
      <AnimatePresence>
        {disputing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.outExpo }}
            className="overflow-hidden"
          >
            <textarea
              value={counterText}
              onChange={(e) => onCounterText(e.target.value)}
              rows={2}
              placeholder="Counter-evidence. The validators will re-judge with both sides."
              className="mt-3 w-full resize-none rounded-control border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-mut/60 focus:border-doubt focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <Button variant="doubt" size="sm" onClick={onCommitDispute} loading={disputePending}>
                File dispute
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelDispute}>
                Never mind
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
