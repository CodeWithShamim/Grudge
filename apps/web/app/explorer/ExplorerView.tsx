"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { staggerList } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useOpenChallenges } from "@/lib/chain/hooks";
import { getChainMode } from "@/lib/chain/client";
import { explorerAddressUrl, grudgeContractAddress } from "@/lib/chain/bradbury";
import type { Challenge, ChallengeStatus } from "@/lib/chain/types";
import { TicketCard, TicketCardSkeleton } from "@/components/TicketCard";
import { EmptyState } from "@/components/ui/EmptyState";

function shortHex(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

/**
 * The grudge explorer — a dense, searchable view over EVERY challenge (all
 * statuses), distinct from the marketing Feed (open only). Search + status +
 * category filters and sort, with pagination so the grid stays bounded.
 */

const STATUS_TABS: { key: "all" | ChallengeStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Live" },
  { key: "SUCCEEDED", label: "Kept" },
  { key: "FAILED", label: "Broken" },
  { key: "SETTLED", label: "Settled" },
];

type SortKey = "newest" | "pot" | "ending";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "pot", label: "Biggest pot" },
  { key: "ending", label: "Ending soon" },
];

const PAGE_SIZE = 12;

function pot(c: Challenge): number {
  return c.believerPool + c.doubterPool + c.selfStake;
}

export function ExplorerView() {
  const { data, isLoading, isError, refetch } = useOpenChallenges();
  const { pick } = useReducedMotionSafe();
  const isLive = getChainMode() === "genlayer";
  const contractAddr = grudgeContractAddress();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ChallengeStatus>("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((data ?? []).map((c) => c.category)))],
    [data],
  );

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      live: all.filter((c) => c.status === "ACTIVE").length,
      staked: all.reduce((s, c) => s + pot(c), 0),
    };
  }, [data]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (category !== "all") list = list.filter((c) => c.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) => c.statement.toLowerCase().includes(q) || c.creator.toLowerCase().includes(q) || c.id === q,
      );
    }
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => Number(b.id) - Number(a.id));
    else if (sort === "pot") sorted.sort((a, b) => pot(b) - pot(a));
    else sorted.sort((a, b) => a.endsAt - b.endsAt);
    return sorted;
  }, [data, status, category, query, sort]);

  // reset to first page whenever the filter set changes
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetPageThen = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* header */}
      <header className="mb-8">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">explorer</p>
        <h1 className="display-statement text-display-lg text-paper">Every grudge on the ledger</h1>
        <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-mut">
          Search and filter the full public record — promises kept, promises broken, and the bets riding on each.
        </p>
        {isLive && contractAddr && (
          <a
            href={explorerAddressUrl(contractAddr)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-control border border-ink-line bg-ink-soft px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-mut transition-colors hover:border-gold/50 hover:text-paper"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Contract {shortHex(contractAddr)} on GenLayer Explorer ↗
          </a>
        )}
      </header>

      {/* stat strip */}
      <dl className="mb-8 grid grid-cols-3 divide-x divide-ink-line rounded-card border border-ink-line bg-ink-soft/60">
        {[
          { label: "Total grudges", value: counts.total.toLocaleString() },
          { label: "Live now", value: counts.live.toLocaleString() },
          { label: "GEN at stake", value: Math.round(counts.staked).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="px-4 py-5 text-center">
            <dd className="font-display text-2xl italic text-paper sm:text-3xl">{s.value}</dd>
            <dt className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mut">{s.label}</dt>
          </div>
        ))}
      </dl>

      {/* controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => resetPageThen(setQuery)(e.target.value)}
            placeholder="Search statement, creator, or grudge #…"
            className="w-full rounded-control border border-ink-line bg-ink-soft px-4 py-2.5 font-sans text-sm text-paper placeholder:text-mut/50 focus:border-gold focus:outline-none sm:max-w-md"
            aria-label="Search grudges"
          />
          <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-mut">
            Sort
            <select
              value={sort}
              onChange={(e) => resetPageThen(setSort)(e.target.value as SortKey)}
              className="rounded-control border border-ink-line bg-ink-soft px-3 py-2 text-paper focus:border-gold focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* status tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={status === t.key}
              onClick={() => resetPageThen(setStatus)(t.key)}
              className={cn(
                "rounded-chip px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors",
                status === t.key ? "bg-gold text-ink" : "bg-ink-raised text-mut hover:text-paper",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* category chips */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
            {categories.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={category === cat}
                onClick={() => resetPageThen(setCategory)(cat)}
                className={cn(
                  "rounded-chip px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  category === cat ? "bg-paper text-ink" : "bg-ink-soft text-mut hover:text-paper",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* results */}
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
          line="No grudges match these filters. Loosen the search or clear a filter."
          cta={
            <Link href="/create" className="font-mono text-xs uppercase tracking-widest text-gold hover:underline">
              Hold a grudge →
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-mut">
            {filtered.length} {filtered.length === 1 ? "grudge" : "grudges"}
          </p>
          <motion.div
            key={`${status}-${category}-${query}-${sort}-${safePage}`}
            variants={pick(staggerList)}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5">
                <TicketCard challenge={c} />
                {isLive && (
                  <a
                    href={explorerAddressUrl(c.creator)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="self-end font-mono text-[10px] uppercase tracking-widest text-mut transition-colors hover:text-gold"
                    title={`View creator ${c.creator} on the GenLayer explorer`}
                  >
                    creator {shortHex(c.creator)} ↗
                  </a>
                )}
              </div>
            ))}
          </motion.div>

          {/* pagination */}
          {pageCount > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4 font-mono text-xs uppercase tracking-widest">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded-control border border-ink-line px-4 py-2 text-mut transition-colors hover:text-paper disabled:opacity-40 disabled:hover:text-mut"
              >
                ← Prev
              </button>
              <span className="text-mut">
                {safePage + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="rounded-control border border-ink-line px-4 py-2 text-mut transition-colors hover:text-paper disabled:opacity-40 disabled:hover:text-mut"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
