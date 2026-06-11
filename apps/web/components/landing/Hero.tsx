"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SPRING } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";

const STATEMENT = "I WILL RUN 5KM EVERY DAY FOR 30 DAYS.";

/**
 * Landing scene 1 — the hero statement types on with a blinking caret,
 * then the tagline stamps in (motion spec #8.1).
 */
export function Hero() {
  const { prefersReduced } = useReducedMotionSafe();
  const [typed, setTyped] = useState(prefersReduced ? STATEMENT : "");
  const doneTyping = typed.length >= STATEMENT.length;

  useEffect(() => {
    if (prefersReduced) {
      setTyped(STATEMENT);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(STATEMENT.slice(0, i));
      if (i >= STATEMENT.length) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [prefersReduced]);

  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-mut">the public grudge ledger</p>
      <h1 className="display-statement max-w-4xl text-display-xl text-paper">
        {typed}
        {!doneTyping && <span className="animate-caret text-gold">▌</span>}
      </h1>

      {doneTyping && (
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -4 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -4 }}
          transition={prefersReduced ? { duration: 0.12 } : SPRING.snappy}
          className="mt-8 border-4 border-doubt px-6 py-2 font-display text-2xl uppercase italic tracking-wide text-doubt sm:text-3xl"
        >
          Your friends bet you&apos;ll fail.
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: prefersReduced ? 0 : 2.4, duration: 0.4 }}
        className="mt-12 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link
          href="/create"
          className="rounded-control bg-gold px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e2 transition-transform hover:bg-gold/90 active:scale-[0.97]"
        >
          Hold a grudge
        </Link>
        <a
          href="#feed"
          className="rounded-control border border-ink-line px-6 py-3 font-mono text-sm uppercase tracking-wider text-mut hover:text-paper"
        >
          Doubt someone braver
        </a>
      </motion.div>

      <p className="absolute bottom-6 animate-breathe font-mono text-[10px] uppercase tracking-widest text-mut">
        scroll — watch a promise get judged ↓
      </p>
    </section>
  );
}
