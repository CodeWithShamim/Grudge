"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SPRING, DUR } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { GenAmount } from "./ui/GenAmount";

/**
 * Signature moment #1 — the tug-of-war.
 * Pool changes move the rope with the `heavy` spring (slight overshoot);
 * stripes drift continuously (GPU background-position); when the lead flips,
 * the new leading side pulses 1.03x with a color flash.
 */
export function TugOfWar({
  believe,
  doubt,
  className,
  compact = false,
}: {
  believe: number;
  doubt: number;
  className?: string;
  compact?: boolean;
}) {
  const total = believe + doubt;
  const believePct = total > 0 ? (believe / total) * 100 : 50;
  const leader: "believe" | "doubt" | "tie" = believe === doubt ? "tie" : believe > doubt ? "believe" : "doubt";
  const prevLeader = useRef(leader);
  const [pulse, setPulse] = useState<"believe" | "doubt" | null>(null);
  const { prefersReduced } = useReducedMotionSafe();

  useEffect(() => {
    if (leader !== "tie" && prevLeader.current !== leader) {
      setPulse(leader);
      const t = setTimeout(() => setPulse(null), 600);
      prevLeader.current = leader;
      return () => clearTimeout(t);
    }
    prevLeader.current = leader;
  }, [leader]);

  return (
    <div className={cn("w-full", className)} aria-live="polite" aria-label={`Believers ${Math.round(believe)} GEN versus doubters ${Math.round(doubt)} GEN`}>
      {!compact && (
        <div className="mb-2 flex items-baseline justify-between font-mono text-sm">
          <span className="text-believe">
            BELIEVERS · <GenAmount value={believe} suffix="" /> <span className="opacity-60">GEN</span>
          </span>
          <span className="text-doubt">
            <GenAmount value={doubt} suffix="" /> <span className="opacity-60">GEN</span> · DOUBTERS
          </span>
        </div>
      )}
      <motion.div
        animate={pulse && !prefersReduced ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "relative flex overflow-hidden rounded-control shadow-e1",
          compact ? "h-3" : "h-8",
        )}
        style={{ willChange: "transform" }}
      >
        <motion.div
          className={cn(
            "stripes-believe relative h-full",
            !prefersReduced && "animate-stripe-drift",
            pulse === "believe" && "shadow-glow-believe",
          )}
          initial={false}
          animate={{ width: `${believePct}%` }}
          transition={prefersReduced ? { duration: DUR.fast } : SPRING.heavy}
        />
        <motion.div
          className={cn(
            "stripes-doubt relative h-full flex-1",
            !prefersReduced && "animate-stripe-drift",
            pulse === "doubt" && "shadow-glow-doubt",
          )}
        />
        {/* the knot */}
        <motion.div
          className="absolute top-0 h-full w-[3px] bg-paper"
          initial={false}
          animate={{ left: `${believePct}%` }}
          transition={prefersReduced ? { duration: DUR.fast } : SPRING.heavy}
          style={{ translateX: "-50%" }}
        />
      </motion.div>
    </div>
  );
}
