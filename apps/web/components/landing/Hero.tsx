"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DUR, EASE, SPRING } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { HeroLedger } from "./HeroLedger";

const STATEMENT = "I WILL RUN 5KM EVERY DAY FOR 30 DAYS.";

const TRUST_POINTS = ["Non-custodial", "On-chain receipts", "Validator-refereed"];

/**
 * Landing scene 1 — a two-column hero. Left rail holds the typewriter
 * statement and the "your friends bet you'll fail" stamp (motion spec #8.1);
 * the right rail streams the live public ledger.
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
    <section className="relative overflow-hidden">
      {/* ambient background: drifting grid + gold/doubt glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-fade" />
        <motion.div
          className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-doubt/10 blur-[120px]"
          animate={prefersReduced ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-gold/10 blur-[120px]"
          animate={prefersReduced ? undefined : { x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="mx-auto grid min-h-[92vh] max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ── left rail ─────────────────────────────────────────── */}
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, ease: EASE.outExpo }}
            className="mb-6 inline-flex items-center gap-2 rounded-chip border border-ink-line bg-ink-soft/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-mut backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            the public grudge ledger
          </motion.p>

          <h1 className="display-statement mx-auto max-w-2xl text-display-xl text-paper lg:mx-0">
            {typed}
            {!doneTyping && <span className="animate-caret text-gold">▌</span>}
          </h1>

          <div className="flex min-h-[3.5rem] justify-center lg:justify-start">
            {doneTyping && (
              <motion.p
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -4 }}
                animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -4 }}
                transition={prefersReduced ? { duration: DUR.fast } : SPRING.snappy}
                className="mt-8 border-4 border-doubt px-6 py-2 font-display text-2xl uppercase italic tracking-wide text-doubt sm:text-3xl"
              >
                Your friends bet you&apos;ll fail.
              </motion.p>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReduced ? 0 : 2.2, duration: DUR.slow }}
            className="mx-auto mt-6 max-w-md font-sans text-base leading-relaxed text-mut lg:mx-0"
          >
            Stake GEN on a promise. Let the doubters stake against you. Every claim is
            judged by GenLayer validator consensus — and the receipt is public forever.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReduced ? 0 : 2.4, duration: DUR.slow }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
          >
            <Link
              href="/create"
              className="group relative overflow-hidden rounded-control bg-gold px-7 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e2 transition-transform hover:bg-gold/90 active:scale-[0.97]"
            >
              <span className="relative z-10">Hold a grudge</span>
              {!prefersReduced && (
                <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-500 group-hover:translate-x-full" />
              )}
            </Link>
            <a
              href="#feed"
              className="rounded-control border border-ink-line px-7 py-3 font-mono text-sm uppercase tracking-wider text-mut transition-colors hover:border-mut/60 hover:text-paper"
            >
              Doubt someone braver
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReduced ? 0 : 2.7, duration: DUR.slow }}
            className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start"
          >
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-mut">
                <span className="text-believe">✓</span>
                {point}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ── right rail: live ledger ───────────────────────────── */}
        <div className="flex justify-center lg:justify-end">
          <HeroLedger />
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 animate-breathe font-mono text-[10px] uppercase tracking-widest text-mut">
        scroll — watch a promise get judged ↓
      </p>
    </section>
  );
}
