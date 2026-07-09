"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { fadeRise } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { oddsLine } from "@/lib/psychology/copy";
import type { Challenge } from "@/lib/chain/types";
import { TugOfWar } from "./TugOfWar";
import { Countdown } from "./Countdown";

const STATUS_BADGE: Record<Challenge["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "LIVE", cls: "bg-gold/15 text-gold" },
  SUCCEEDED: { label: "KEPT", cls: "bg-believe/15 text-believe" },
  FAILED: { label: "BROKEN", cls: "bg-doubt/15 text-doubt" },
  SETTLED: { label: "SETTLED", cls: "bg-mut/15 text-mut" },
};

/**
 * The feed ticket. Information scent in <1s: statement > odds line >
 * countdown > pools. Desktop-only 2° pointer tilt with specular highlight
 * (micro-interaction spec #9). The header carries the shared-element id for
 * the feed -> detail morph.
 */
export function TicketCard({ challenge, className }: { challenge: Challenge; className?: string }) {
  const { prefersReduced, pick } = useReducedMotionSafe();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [2, -2]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-2, 2]), { stiffness: 200, damping: 25 });
  const specularX = useTransform(mx, [0, 1], ["20%", "80%"]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  const badge = STATUS_BADGE[challenge.status];

  return (
    <motion.div variants={pick(fadeRise)} className={cn("group h-full", className)}>
      <Link href={`/challenge/${challenge.id}`} className="block h-full focus-visible:outline-none">
        <motion.article
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            mx.set(0.5);
            my.set(0.5);
          }}
          style={prefersReduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
          className="grain relative flex h-full flex-col overflow-hidden rounded-card bg-ink-soft p-5 shadow-e2 transition-shadow duration-200 group-hover:shadow-e3 group-focus-visible:ring-2 group-focus-visible:ring-gold"
        >
          {/* specular highlight */}
          {!prefersReduced && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full bg-paper/5 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ left: specularX, translateX: "-50%" }}
            />
          )}

          <div className="mb-3 flex items-center justify-between gap-2">
            <span className={cn("rounded-chip px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest", badge.cls)}>
              {badge.label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-mut">
              #{challenge.id} · {challenge.category}
            </span>
          </div>

          <h3
            className="display-statement mb-2 line-clamp-2 min-h-[2.1em] text-display-md text-paper"
            data-shared={`statement-${challenge.id}`}
          >
            {challenge.statement}
          </h3>

          <p className="mb-4 line-clamp-1 font-mono text-xs text-gold">{oddsLine(challenge)}</p>

          <TugOfWar
            believe={challenge.believerPool + challenge.selfStake}
            doubt={challenge.doubterPool}
            compact
            className="mt-auto"
          />

          <div className="mt-3 flex items-center justify-between">
            <Countdown endsAt={challenge.endsAt} className="text-xs" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-mut">
              {challenge.verifiedCount}/{challenge.requiredProofs} proofs
            </span>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}

/** Skeleton shaped like a real TicketCard — never a bare gray box. */
export function TicketCardSkeleton() {
  return (
    <div className="rounded-card bg-ink-soft p-5 shadow-e2">
      <div className="mb-3 flex justify-between">
        <div className="skeleton h-4 w-12" />
        <div className="skeleton h-4 w-20" />
      </div>
      <div className="skeleton mb-2 h-7 w-4/5" />
      <div className="skeleton mb-4 h-4 w-3/5" />
      <div className="skeleton h-3 w-full" />
      <div className="mt-3 flex justify-between">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-16" />
      </div>
    </div>
  );
}
