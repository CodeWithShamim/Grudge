"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeRise, staggerList } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useLeaderboards } from "@/lib/chain/hooks";
import { shortAddress } from "@/lib/utils";

export default function LeaderboardsPage() {
  const { data, isLoading } = useLeaderboards();
  const { pick } = useReducedMotionSafe();

  return (
    <motion.div
      variants={pick(staggerList)}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-4 py-12"
    >
      <motion.h1 variants={pick(fadeRise)} className="display-statement mb-10 text-display-lg text-paper">
        The boards
      </motion.h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Board title="Most Unbreakable" subtitle="promises kept" loading={isLoading}>
          {data?.mostUnbreakable.map((r, i) => (
            <Row key={r.address} rank={i + 1} label={shortAddress(r.address)} value={`${r.kept} kept · ${r.broken} broken`} accent="text-believe" />
          ))}
        </Board>
        <Board title="Sharpest Doubter" subtitle="doubt ROI" loading={isLoading}>
          {data?.sharpestDoubters.map((r, i) => (
            <Row key={r.address} rank={i + 1} label={shortAddress(r.address)} value={`${r.roi.toFixed(2)}x on ${Math.round(r.staked)} GEN`} accent="text-doubt" />
          ))}
        </Board>
        <Board title="Biggest Pot" subtitle="total at stake" loading={isLoading}>
          {data?.biggestPots.map((r, i) => (
            <Link key={r.challengeId} href={`/challenge/${r.challengeId}`} className="block hover:bg-ink-raised">
              <Row rank={i + 1} label={r.statement} value={`${Math.round(r.pot)} GEN`} accent="text-gold" />
            </Link>
          ))}
        </Board>
      </div>
    </motion.div>
  );
}

function Board({
  title,
  subtitle,
  loading,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  const { pick } = useReducedMotionSafe();
  return (
    <motion.section variants={pick(fadeRise)} className="grain relative rounded-card bg-ink-soft shadow-e2">
      <header className="border-b border-ink-line p-4">
        <h2 className="display-statement text-xl text-paper">{title}</h2>
        <p className="font-mono text-[10px] uppercase tracking-widest text-mut">{subtitle}</p>
      </header>
      <div className="divide-y divide-ink-line">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="skeleton size-6" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))
          : children}
      </div>
    </motion.section>
  );
}

function Row({ rank, label, value, accent }: { rank: number; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="w-6 text-center font-mono text-xs text-mut">{rank}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-paper/90">{label}</span>
      <span className={`shrink-0 font-mono text-xs tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}
