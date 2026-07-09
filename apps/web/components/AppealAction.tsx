"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAppealVerdict } from "@/lib/chain/hooks";
import { DUR, EASE } from "@/lib/motion/tokens";
import { Button } from "./ui/Button";

const MIN_APPEAL_BOND = 0.1; // GEN, mirrors the contract's MIN_APPEAL_BOND

/**
 * F1: the creator appeals a REJECTED verdict with a bond. A fresh consensus
 * round re-judges; a flip to VERIFIED returns the bond, otherwise it's
 * forfeited to the doubter pool. Self-contained (its own bond + mutation).
 */
export function AppealAction({
  challengeId,
  evidenceIndex,
  appealed,
}: {
  challengeId: string;
  evidenceIndex: number;
  appealed: boolean;
}) {
  const appeal = useAppealVerdict(challengeId);
  const [open, setOpen] = useState(false);
  const [bond, setBond] = useState(MIN_APPEAL_BOND);

  if (appealed) {
    return <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-mut">appeal heard</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 font-mono text-[11px] uppercase tracking-widest text-gold hover:underline"
      >
        Appeal this verdict →
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: DUR.base, ease: EASE.outExpo }}
        className="overflow-hidden"
      >
        <div className="mt-3 rounded-control border border-gold/40 bg-ink p-3">
          <p className="mb-2 font-sans text-xs text-mut">
            A second tribunal re-judges on the merits. Win → your bond comes back and the proof
            counts. Lose → the bond goes to the doubters.
          </p>
          <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-mut">
            Bond (GEN)
            <input
              type="number"
              min={MIN_APPEAL_BOND}
              step={0.1}
              value={bond}
              onChange={(e) => setBond(Math.max(MIN_APPEAL_BOND, Number(e.target.value)))}
              className="w-24 rounded-control border border-ink-line bg-ink-soft px-2 py-1 text-paper focus:border-gold focus:outline-none"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              loading={appeal.isPending}
              onClick={() => appeal.mutate({ evidenceIndex, bond }, { onSuccess: () => setOpen(false) })}
            >
              Stake bond & appeal
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Never mind
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
