"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { staggerList, fadeRise } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import type { Challenge, EvidenceEntry } from "@/lib/chain/types";

const CELL: Record<EvidenceEntry["verdict"], string> = {
  VERIFIED: "bg-believe text-ink",
  SUSPICIOUS: "bg-gold text-ink",
  REJECTED: "bg-doubt text-paper",
};

/**
 * The proof grid: one cell per proof period. Today's cell breathes
 * (1.0 -> 1.04 loop, micro-interaction spec #9); past cells are stamped with
 * their verdict; future cells are empty sockets.
 */
export function ProofGrid({ challenge, className }: { challenge: Challenge; className?: string }) {
  const { prefersReduced, pick } = useReducedMotionSafe();
  const totalDays = Math.max(
    1,
    Math.round((challenge.endsAt - challenge.startsAt) / 86_400_000),
  );
  const today = Math.min(
    totalDays,
    Math.floor((Date.now() - challenge.startsAt) / 86_400_000) + 1,
  );
  const byDay = new Map(challenge.evidence.map((e) => [e.day, e]));

  return (
    <motion.div
      variants={pick(staggerList)}
      initial="hidden"
      animate="visible"
      className={cn("grid grid-cols-7 gap-1.5 sm:grid-cols-10", className)}
      role="list"
      aria-label="Proof history"
    >
      {Array.from({ length: totalDays }, (_, i) => {
        const day = i + 1;
        const entry = byDay.get(day);
        const isToday = day === today && challenge.status === "ACTIVE";
        return (
          <motion.div
            key={day}
            variants={pick(fadeRise)}
            role="listitem"
            aria-label={`Day ${day}: ${entry ? entry.verdict : isToday ? "awaiting proof" : day < today ? "missed" : "upcoming"}`}
            title={entry ? `Day ${day} - ${entry.verdict}: ${entry.reason}` : `Day ${day}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-chip font-mono text-[10px] font-bold",
              entry
                ? CELL[entry.verdict]
                : isToday
                  ? cn("border-2 border-dashed border-gold text-gold", !prefersReduced && "animate-breathe")
                  : day < today
                    ? "bg-ink-raised text-mut/50 line-through"
                    : "border border-ink-line text-mut/40",
            )}
          >
            {day}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
