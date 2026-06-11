"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SPRING, VALIDATOR_FLIP_STAGGER_MS } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import type { Verdict } from "@/lib/chain/types";

const VOTE_COLOR: Record<Verdict, string> = {
  VERIFIED: "bg-believe text-ink",
  SUSPICIOUS: "bg-gold text-ink",
  REJECTED: "bg-doubt text-paper",
};

const NODE_COUNT = 5;
/** Node positions along an arc (percent offsets). */
const ARC_Y = [28, 8, 0, 8, 28];

type Phase = "appear" | "thinking" | "voting" | "done";

/**
 * Signature moment #3 — "Validators voting…".
 * Five validator nodes appear in an arc, pulse while thinking, then flip
 * one-by-one (120ms stagger) to the vote color before the stamp slams.
 * This animation IS the product story: LLM validators reaching consensus.
 */
export function ValidatorArc({
  verdict,
  thinkingMs = 2200,
  onComplete,
  className,
}: {
  /** Final consensus verdict; nodes flip to it one by one. */
  verdict: Verdict;
  /** How long the nodes "think" before voting begins. */
  thinkingMs?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("appear");
  const [votes, setVotes] = useState<number>(0);
  const { prefersReduced } = useReducedMotionSafe();

  useEffect(() => {
    if (prefersReduced) {
      setVotes(NODE_COUNT);
      setPhase("done");
      const t = setTimeout(() => onComplete?.(), 200);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("thinking"), 400));
    timers.push(setTimeout(() => setPhase("voting"), 400 + thinkingMs));
    for (let i = 1; i <= NODE_COUNT; i++) {
      timers.push(
        setTimeout(() => setVotes(i), 400 + thinkingMs + i * VALIDATOR_FLIP_STAGGER_MS),
      );
    }
    timers.push(
      setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, 400 + thinkingMs + NODE_COUNT * VALIDATOR_FLIP_STAGGER_MS + 300),
    );
    return () => timers.forEach(clearTimeout);
  }, [thinkingMs, onComplete, prefersReduced]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)} role="status" aria-live="polite">
      <div className="flex items-end gap-3 sm:gap-5">
        {Array.from({ length: NODE_COUNT }, (_, i) => {
          const voted = votes > i;
          return (
            <motion.div
              key={i}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.6 }}
              animate={
                voted
                  ? { opacity: 1, y: ARC_Y[i], scale: [1.25, 1] }
                  : phase === "thinking" && !prefersReduced
                    ? { opacity: [0.5, 1, 0.5], y: ARC_Y[i], scale: [1, 1.1, 1] }
                    : { opacity: 1, y: ARC_Y[i], scale: 1 }
              }
              transition={
                voted
                  ? SPRING.snappy
                  : phase === "thinking"
                    ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }
                    : { ...SPRING.snappy, delay: i * 0.07 }
              }
              className={cn(
                "flex size-10 items-center justify-center rounded-full font-mono text-xs font-bold shadow-e2 sm:size-12",
                voted ? VOTE_COLOR[verdict] : "bg-ink-raised text-mut",
              )}
              style={{ willChange: "transform, opacity" }}
            >
              {voted ? (verdict === "VERIFIED" ? "✓" : verdict === "REJECTED" ? "✕" : "?") : `V${i + 1}`}
            </motion.div>
          );
        })}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-mut">
        {phase === "done"
          ? `${votes}/${NODE_COUNT} validators reached consensus`
          : phase === "voting"
            ? `${votes}/${NODE_COUNT} votes in…`
            : "validators are reading the evidence…"}
      </p>
    </div>
  );
}
