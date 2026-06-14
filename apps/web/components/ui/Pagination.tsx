"use client";

import { useMemo, useState } from "react";

/** Default page size across the app's paginated lists. */
export const PAGE_SIZE = 9;

interface PaginationResult<T> {
  page: number;
  pageCount: number;
  /** The current page's slice of items. */
  items: T[];
  setPage: (p: number) => void;
  next: () => void;
  prev: () => void;
}

/**
 * Client-side pagination over an in-memory list. Clamps the page when the list
 * shrinks (e.g. after a filter change), so the view never lands out of range.
 * Pass a `resetKey` that changes whenever the source list/filters change to
 * snap back to page 1.
 */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE, resetKey?: string): PaginationResult<T> {
  const [page, setPage] = useState(0);
  const [seenKey, setSeenKey] = useState(resetKey);

  // reset to first page when the upstream key changes (filters/search/sort)
  if (resetKey !== seenKey) {
    setSeenKey(resetKey);
    if (page !== 0) setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    pageCount,
    items: pageItems,
    setPage,
    next: () => setPage((p) => Math.min(pageCount - 1, p + 1)),
    prev: () => setPage((p) => Math.max(0, p - 1)),
  };
}

/** Prev / page-count / Next control. Renders nothing for a single page. */
export function Pagination({
  page,
  pageCount,
  onPrev,
  onNext,
  className = "",
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className={`mt-10 flex items-center justify-center gap-4 font-mono text-xs uppercase tracking-widest ${className}`}>
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="rounded-control border border-ink-line px-4 py-2 text-mut transition-colors hover:text-paper disabled:opacity-40 disabled:hover:text-mut"
      >
        ← Prev
      </button>
      <span className="text-mut">
        {page + 1} / {pageCount}
      </span>
      <button
        onClick={onNext}
        disabled={page >= pageCount - 1}
        className="rounded-control border border-ink-line px-4 py-2 text-mut transition-colors hover:text-paper disabled:opacity-40 disabled:hover:text-mut"
      >
        Next →
      </button>
    </div>
  );
}
