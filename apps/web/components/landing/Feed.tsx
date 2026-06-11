"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { staggerList } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useOpenChallenges } from "@/lib/chain/hooks";
import { EMPTY_STATES } from "@/lib/psychology/copy";
import { TicketCard, TicketCardSkeleton } from "@/components/TicketCard";
import { EmptyState } from "@/components/ui/EmptyState";

/** Live grudge feed with category chips, staggered tickets, shaped skeletons. */
export function Feed() {
  const { data, isLoading, isError, refetch } = useOpenChallenges();
  const [category, setCategory] = useState<string>("all");
  const { pick } = useReducedMotionSafe();

  const categories = useMemo(
    () => ["all", ...new Set((data ?? []).map((c) => c.category))],
    [data],
  );
  const filtered = (data ?? []).filter((c) => category === "all" || c.category === category);

  return (
    <section id="feed" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="display-statement text-display-lg text-paper">The open ledger</h2>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-chip px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors",
                category === cat ? "bg-gold text-ink" : "bg-ink-raised text-mut hover:text-paper",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <EmptyState
          line="The ledger didn't respond. Chain data failed to parse or load."
          cta={
            <button onClick={() => void refetch()} className="font-mono text-xs uppercase tracking-widest text-gold hover:underline">
              Retry →
            </button>
          }
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          line={EMPTY_STATES.feed}
          cta={
            <Link href="/create" className="font-mono text-xs uppercase tracking-widest text-gold hover:underline">
              Hold a grudge →
            </Link>
          }
        />
      ) : (
        <motion.div
          variants={pick(staggerList)}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((c) => (
            <TicketCard key={c.id} challenge={c} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
