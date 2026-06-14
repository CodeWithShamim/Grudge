"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { DUR, EASE, STAGGER } from "@/lib/motion/tokens";
import { staggerList, fadeRise } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useOpenChallenges } from "@/lib/chain/hooks";

/**
 * Featured "how it works" section — three steps, animated on scroll into view,
 * topped by live ledger stats so the page leads with real on-chain numbers
 * instead of placeholder copy.
 */

const STEPS = [
  {
    n: "01",
    title: "Stake on a promise",
    body: "Write a concrete, time-boxed claim and back it with GEN. Your self-stake is the line you're daring the world to cross.",
    accent: "text-gold",
    border: "hover:border-gold/40",
  },
  {
    n: "02",
    title: "Doubters bet against you",
    body: "Anyone can stake that you'll fold. Believers stake that you won't. The pools grow public and the odds move in real time.",
    accent: "text-doubt",
    border: "hover:border-doubt/40",
  },
  {
    n: "03",
    title: "Validators settle the truth",
    body: "Submit evidence; GenLayer's validator LLMs reach consensus on whether it holds. The contract pays the winning side - automatically.",
    accent: "text-believe",
    border: "hover:border-believe/40",
  },
] as const;

function formatGen(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export function HowItWorks() {
  const { pick, prefersReduced } = useReducedMotionSafe();
  const { data } = useOpenChallenges();

  const stats = useMemo(() => {
    const all = data ?? [];
    const totalPot = all.reduce(
      (s, c) => s + c.believerPool + c.doubterPool + c.selfStake,
      0,
    );
    const stakeCount = all.reduce((s, c) => s + c.stakes.length, 0);
    return [
      { label: "Open grudges", value: all.length.toLocaleString() },
      { label: "GEN at stake", value: formatGen(totalPot) },
      { label: "Bets placed", value: stakeCount.toLocaleString() },
    ];
  }, [data]);

  return (
    <section id="how-it-works" className="relative mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={pick(staggerList)}
        className="mx-auto max-w-2xl text-center"
      >
        <motion.p variants={pick(fadeRise)} className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
          how it works
        </motion.p>
        <motion.h2 variants={pick(fadeRise)} className="display-statement text-display-lg text-paper">
          Put money where your word is.
        </motion.h2>
        <motion.p variants={pick(fadeRise)} className="mt-5 font-sans text-base leading-relaxed text-mut">
          GRUDGE turns a promise into an on-chain market. Stake on yourself, let the
          doubters stake against you, and let validator consensus - not a referee - decide who was right.
        </motion.p>
      </motion.div>

      {/* live stat band */}
      <motion.dl
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={pick(staggerList)}
        className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-ink-line rounded-card border border-ink-line bg-ink-soft/60 backdrop-blur"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={pick(fadeRise)} className="px-4 py-6 text-center">
            <dd className="font-display text-2xl italic text-paper sm:text-3xl">{s.value}</dd>
            <dt className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mut">{s.label}</dt>
          </motion.div>
        ))}
      </motion.dl>

      {/* three steps */}
      <motion.ol
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={pick(staggerList)}
        className="mt-12 grid gap-5 md:grid-cols-3"
      >
        {STEPS.map((step) => (
          <motion.li
            key={step.n}
            variants={pick(fadeRise)}
            whileHover={prefersReduced ? undefined : { y: -4 }}
            transition={{ duration: DUR.base, ease: EASE.outExpo }}
            className={`group relative overflow-hidden rounded-card border border-ink-line bg-ink-soft p-7 shadow-e1 transition-colors ${step.border}`}
          >
            <span className={`font-display text-5xl italic leading-none ${step.accent} opacity-30`}>
              {step.n}
            </span>
            <h3 className="mt-4 font-display text-xl uppercase italic tracking-wide text-paper">
              {step.title}
            </h3>
            <p className="mt-3 font-sans text-sm leading-relaxed text-mut">{step.body}</p>
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10"
            />
          </motion.li>
        ))}
      </motion.ol>

      <motion.div
        initial={{ opacity: 0, y: STAGGER.yOffset }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.slow, ease: EASE.outExpo }}
        className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Link
          href="/create"
          className="rounded-control bg-gold px-7 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-e2 transition-transform hover:bg-gold/90 active:scale-[0.97]"
        >
          Put money on yourself
        </Link>
        <a
          href="#feed"
          className="rounded-control border border-ink-line px-7 py-3 font-mono text-sm uppercase tracking-wider text-mut transition-colors hover:border-mut/60 hover:text-paper"
        >
          Browse the ledger
        </a>
      </motion.div>
    </section>
  );
}
