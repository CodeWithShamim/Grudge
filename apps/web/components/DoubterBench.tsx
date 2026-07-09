"use client";

import { motion } from "framer-motion";
import { cn, shortAddress } from "@/lib/utils";
import { ConvictionBadge } from "./ConvictionBadge";
import { staggerList, tauntPop } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { EMPTY_STATES } from "@/lib/psychology/copy";
import type { Challenge } from "@/lib/chain/types";
import { GenAmount } from "./ui/GenAmount";
import { EmptyState } from "./ui/EmptyState";

/**
 * The doubters' bench: every doubt stake with its public taunt.
 * Taunts pop in with a small shake (micro-interaction spec #9).
 */
export function DoubterBench({ challenge, className }: { challenge: Challenge; className?: string }) {
  const { pick } = useReducedMotionSafe();
  const doubters = challenge.stakes
    .filter((s) => s.side === "doubt")
    .sort((a, b) => b.amount - a.amount);

  if (doubters.length === 0) {
    return <EmptyState line={EMPTY_STATES.doubters} className="py-8" />;
  }

  return (
    <motion.ul
      variants={pick(staggerList)}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
      aria-label="Doubters and their taunts"
    >
      {doubters.map((s, i) => (
        <motion.li
          key={`${s.address}-${i}`}
          variants={pick(tauntPop)}
          className="grain relative rounded-card bg-ink-soft p-4 shadow-e1"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-doubt">
              {shortAddress(s.address)}
              <ConvictionBadge address={s.address} kind="doubter" />
            </span>
            <GenAmount value={s.amount} className="text-sm text-doubt" />
          </div>
          {s.taunt && <p className="mt-2 text-sm italic text-paper/90">&ldquo;{s.taunt}&rdquo;</p>}
        </motion.li>
      ))}
    </motion.ul>
  );
}
