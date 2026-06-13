"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DUR, EASE, SPRING, STAGGER } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useOpenChallenges } from "@/lib/chain/hooks";
import type { Challenge, Side } from "@/lib/chain/types";

/**
 * Hero right-rail ledger — a live "betting slip" of the most recent moves on
 * the public grudge ledger. New rows stream in from the top so the hero feels
 * alive; falls back to a curated reel when the chain has no data yet (or in
 * mock mode), so the panel is never empty on first paint.
 */

interface LedgerRow {
  key: string;
  id: string;
  side: Side;
  actor: string;
  amount: number;
  statement: string;
  at: number;
}

const SAMPLE_REEL: LedgerRow[] = [
  { key: "s1", id: "04", side: "doubt", actor: "0x9f…2a", amount: 120, statement: "Ship the app before the demo", at: 0 },
  { key: "s2", id: "11", side: "believe", actor: "0xab…07", amount: 80, statement: "Run 5km every day for 30 days", at: 0 },
  { key: "s3", id: "07", side: "doubt", actor: "0x33…c1", amount: 250, statement: "Quit sugar for the whole quarter", at: 0 },
  { key: "s4", id: "02", side: "believe", actor: "0x6e…91", amount: 40, statement: "Write 500 words daily", at: 0 },
  { key: "s5", id: "09", side: "doubt", actor: "0x1d…ff", amount: 175, statement: "Cold shower, 60 days straight", at: 0 },
];

function shortHash(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-2)}` : addr;
}

/** Flatten challenges into newest-first stake rows for the streaming ledger. */
function toRows(challenges: Challenge[]): LedgerRow[] {
  return challenges
    .flatMap((c) =>
      c.stakes.map((s, i) => ({
        key: `${c.id}-${i}-${s.at}`,
        id: c.id,
        side: s.side,
        actor: shortHash(s.address),
        amount: s.amount,
        statement: c.statement,
        at: s.at,
      })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);
}

export function HeroLedger() {
  const { prefersReduced } = useReducedMotionSafe();
  const { data } = useOpenChallenges();

  const liveRows = useMemo(() => toRows(data ?? []), [data]);

  // When there's no live data, cycle the sample reel so the panel breathes.
  const [reelStart, setReelStart] = useState(0);
  const useReel = liveRows.length === 0;

  useEffect(() => {
    if (!useReel || prefersReduced) return;
    const t = setInterval(() => setReelStart((n) => (n + 1) % SAMPLE_REEL.length), 2600);
    return () => clearInterval(t);
  }, [useReel, prefersReduced]);

  const rows: LedgerRow[] = useReel
    ? Array.from({ length: 5 }, (_, i) => {
        const base = SAMPLE_REEL[(reelStart + i) % SAMPLE_REEL.length]!;
        // unique key per cycle so AnimatePresence re-animates the stream
        return { ...base, key: `${base.key}-${reelStart}` };
      })
    : liveRows;

  const totalPot = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <motion.aside
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24, rotate: 1.5 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 1.5 }}
      transition={prefersReduced ? { duration: DUR.base } : { ...SPRING.heavy, delay: 0.3 }}
      className="relative w-full max-w-sm"
      aria-label="Live grudge ledger"
    >
      {/* perforated betting-slip card */}
      <div className="relative overflow-hidden rounded-card border border-ink-line bg-ink-soft shadow-e3">
        {/* header */}
        <div className="flex items-center justify-between border-b border-dashed border-ink-line px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Public ledger</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-believe">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-believe"
              animate={prefersReduced ? undefined : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            live
          </span>
        </div>

        {/* streaming rows */}
        <ul className="divide-y divide-ink-line/60">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((r, idx) => (
              <motion.li
                key={r.key}
                layout
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -STAGGER.yOffset }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: STAGGER.yOffset }}
                transition={
                  prefersReduced
                    ? { duration: DUR.fast }
                    : { duration: DUR.base, ease: EASE.outExpo, delay: idx * STAGGER.step }
                }
                className="flex items-center gap-3 px-5 py-3"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-chip px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                    r.side === "doubt" ? "bg-doubt/15 text-doubt" : "bg-believe/15 text-believe",
                  )}
                >
                  {r.side}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[13px] leading-tight text-paper">{r.statement}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-mut">
                    {r.actor} · grudge #{r.id}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-gold">
                  {r.amount}
                  <span className="ml-0.5 text-[9px] text-gold/60">GEN</span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* perforation + total footer */}
        <div className="relative border-t border-dashed border-ink-line">
          <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-ink" />
          <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-ink" />
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">Pot in view</span>
            <motion.span
              key={totalPot}
              initial={prefersReduced ? false : { scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={SPRING.snappy}
              className="font-display text-lg italic text-gold"
            >
              {totalPot.toLocaleString()} GEN
            </motion.span>
          </div>
        </div>
      </div>

      {/* soft gold glow behind the slip */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-card bg-gold/10 blur-3xl"
      />
    </motion.aside>
  );
}
