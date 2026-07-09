"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useExplainVerdict } from "@/lib/chain/hooks";
import { explorerTxUrl } from "@/lib/chain/bradbury";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { DUR, EASE } from "@/lib/motion/tokens";

/**
 * F3: "Explain this verdict" disclosure. On click it runs the read-only
 * consensus view and reveals the referee's reasoning with a typewriter effect.
 * Shareable — once revealed, a share button links to the OG card.
 */
export function ExplainVerdict({
  challengeId,
  evidenceIndex,
}: {
  challengeId: string;
  evidenceIndex: number;
}) {
  const explain = useExplainVerdict(challengeId);
  const { prefersReduced } = useReducedMotionSafe();
  const text = explain.data?.explanation ?? "";
  const [typed, setTyped] = useState("");

  // typewriter reveal of the explanation
  useEffect(() => {
    if (!text) {
      setTyped("");
      return;
    }
    if (prefersReduced) {
      setTyped(text);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [text, prefersReduced]);

  if (!explain.data && !explain.isPending) {
    return (
      <button
        onClick={() => explain.mutate(evidenceIndex)}
        className="mt-2 font-mono text-[10px] uppercase tracking-widest text-mut transition-colors hover:text-gold"
      >
        ✦ Explain this verdict
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: DUR.base, ease: EASE.outExpo }}
        className="mt-3 rounded-control border border-ink-line bg-ink/60 p-3"
      >
        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.3em] text-gold">
          the referee explains
        </p>
        {explain.isPending ? (
          <p className="font-sans text-xs text-mut">Reaching consensus…</p>
        ) : (
          <>
            <p className="font-sans text-xs leading-relaxed text-paper/90">
              {typed}
              {typed.length < text.length && <span className="animate-caret text-gold">▌</span>}
            </p>
            <a
              href={explorerTxUrl(challengeId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-mut transition-colors hover:text-gold"
            >
              ↗ share this verdict
            </a>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
