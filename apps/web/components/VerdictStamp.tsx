"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import type { Verdict } from "@/lib/chain/types";

const VERDICT_STYLE: Record<Verdict, { border: string; text: string; label: string }> = {
  VERIFIED: { border: "border-believe", text: "text-believe", label: "VERIFIED" },
  SUSPICIOUS: { border: "border-gold", text: "text-gold", label: "SUSPICIOUS" },
  REJECTED: { border: "border-doubt", text: "text-doubt", label: "REJECTED" },
};

/**
 * Signature moment #2 — the VerdictStamp.
 * Rubber-stamp physics: 1.6 -> 1 scale with a random ±6° rotation, a single
 * 60ms translate shake on REJECTED, ink-bleed reveal via clip-path, then the
 * consensus line types on character-by-character.
 */
export function VerdictStamp({
  verdict,
  consensusLine = "5/5 nodes agree",
  txHash,
  className,
}: {
  verdict: Verdict;
  consensusLine?: string;
  txHash?: string;
  className?: string;
}) {
  const rotate = useMemo(() => (Math.random() * 12 - 6) * (verdict === "REJECTED" ? 1.2 : 1), [verdict]);
  const style = VERDICT_STYLE[verdict];
  const shake = useAnimationControls();
  const { prefersReduced } = useReducedMotionSafe();
  const [stamped, setStamped] = useState(false);

  const fullLine = txHash ? `${consensusLine} · tx ${txHash.slice(0, 10)}…` : consensusLine;
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!stamped) return;
    if (prefersReduced) {
      setTyped(fullLine);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(fullLine.slice(0, i));
      if (i >= fullLine.length) clearInterval(t);
    }, 24);
    return () => clearInterval(t);
  }, [stamped, fullLine, prefersReduced]);

  useEffect(() => {
    if (stamped && verdict === "REJECTED" && !prefersReduced) {
      void shake.start({
        x: [0, -6, 5, -3, 0],
        transition: { duration: 0.06 * 4, ease: "linear" },
      });
    }
  }, [stamped, verdict, shake, prefersReduced]);

  return (
    <motion.div animate={shake} className={cn("inline-flex flex-col items-center gap-2", className)}>
      <motion.div
        role="status"
        aria-live="polite"
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate }}
        transition={prefersReduced ? { duration: 0.12 } : SPRING.snappy}
        onAnimationComplete={() => setStamped(true)}
        className={cn(
          "select-none border-4 px-6 py-2 font-display text-3xl uppercase italic tracking-wider sm:text-4xl",
          style.border,
          style.text,
        )}
        style={{
          willChange: "transform",
          // ink-bleed reveal
          clipPath: stamped || prefersReduced ? "inset(0% 0% 0% 0%)" : undefined,
          maskImage: "radial-gradient(ellipse 120% 100% at 50% 50%, black 60%, transparent 100%)",
        }}
      >
        {style.label}
      </motion.div>
      <p className="h-4 font-mono text-[11px] uppercase tracking-widest text-mut">
        {typed}
        {stamped && typed.length < fullLine.length && <span className="animate-caret">▌</span>}
      </p>
    </motion.div>
  );
}
