"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeRise, staggerList, receiptDeal } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useClaim, useClaimable, useProfile, useViewer } from "@/lib/chain/hooks";
import { EMPTY_STATES } from "@/lib/psychology/copy";
import { shortAddress } from "@/lib/utils";
import { GenAmount } from "./ui/GenAmount";
import { ConvictionBadge } from "./ConvictionBadge";
import { EmptyState } from "./ui/EmptyState";
import { Pagination, usePagination } from "./ui/Pagination";

export function ProfileView({ address }: { address: string }) {
  const { data: profile, isLoading } = useProfile(address);
  const { address: viewer } = useViewer();
  const isOwn = viewer.toLowerCase() === address.toLowerCase();
  const { data: claimable = 0 } = useClaimable(address);
  const claim = useClaim();
  const { pick } = useReducedMotionSafe();

  // paginate the receipts (called before the early return — rules of hooks)
  const receipts = usePagination(profile?.calledItReceipts ?? [], 9, address);

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="skeleton mb-6 h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "kept", value: profile.kept, cls: "text-believe" },
    { label: "broken", value: profile.broken, cls: "text-doubt" },
    { label: "streak", value: profile.currentStreak, cls: "text-gold" },
  ];

  return (
    <motion.div variants={pick(staggerList)} initial="hidden" animate="visible" className="mx-auto max-w-3xl px-4 py-12">
      <motion.header variants={pick(fadeRise)} className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-mut">the record of</p>
        <h1 className="display-statement text-display-lg text-paper">{shortAddress(address)}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <ConvictionBadge address={address} kind="creator" />
          <ConvictionBadge address={address} kind="doubter" />
        </div>
      </motion.header>

      <motion.div variants={pick(fadeRise)} className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="grain relative rounded-card bg-ink-soft p-4 text-center shadow-e1">
            <p className={`font-mono text-3xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-mut">{s.label}</p>
          </div>
        ))}
        <div className="grain relative rounded-card bg-ink-soft p-4 text-center shadow-e1">
          <GenAmount value={profile.earnings} className="text-2xl font-bold text-gold" suffix="" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-mut">GEN earned</p>
        </div>
      </motion.div>

      {isOwn && claimable > 0 && (
        <motion.div
          variants={pick(fadeRise)}
          className="grain relative mb-12 flex items-center justify-between gap-4 rounded-card bg-ink-soft p-4 shadow-e1"
        >
          <div>
            <GenAmount value={claimable} className="text-xl font-bold text-gold" suffix="" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-mut">
              GEN waiting to be claimed
            </p>
          </div>
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="rounded-card bg-gold px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {claim.isPending ? "claiming…" : "claim it"}
          </button>
        </motion.div>
      )}

      <motion.section variants={pick(fadeRise)}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-mut">
          &ldquo;Called it&rdquo; receipts · {profile.calledItReceipts.length}
        </h2>
        {profile.calledItReceipts.length === 0 ? (
          <EmptyState line={EMPTY_STATES.receipts} />
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              {receipts.items.map((r, i) => (
                <motion.div
                  key={`${r.challengeId}-${i}`}
                  custom={i}
                  variants={pick(receiptDeal)}
                  className="grain relative w-52 rounded-card bg-paper p-4 text-ink shadow-e3"
                >
                  <p className="font-display text-xl uppercase italic leading-none">Called it</p>
                  <Link href={`/challenge/${r.challengeId}`} className="mt-2 block truncate text-xs hover:underline">
                    &ldquo;{r.statement}&rdquo;
                  </Link>
                  <div className="mt-2 flex justify-between font-mono text-xs tabular-nums">
                    <span>staked {Math.round(r.amount)}</span>
                    <span className="font-bold">won {Math.round(r.winnings)}</span>
                  </div>
                  <div className="perforation mt-3 h-2 w-full opacity-40" aria-hidden />
                </motion.div>
              ))}
            </div>
            <Pagination
              page={receipts.page}
              pageCount={receipts.pageCount}
              onPrev={receipts.prev}
              onNext={receipts.next}
            />
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
