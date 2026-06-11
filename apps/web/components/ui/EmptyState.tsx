import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty state: small illustration + one line + a single CTA.
 * Default illustration is a torn ledger page.
 */
export function EmptyState({
  line,
  cta,
  className,
}: {
  line: string;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4 py-16 text-center", className)}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden className="opacity-50">
        <rect x="14" y="8" width="44" height="52" rx="4" stroke="#8a8f99" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M14 44 L22 48 L30 42 L38 49 L46 43 L58 47" stroke="#8a8f99" strokeWidth="2" />
        <line x1="22" y1="20" x2="50" y2="20" stroke="#8a8f99" strokeWidth="2" />
        <line x1="22" y1="28" x2="44" y2="28" stroke="#8a8f99" strokeWidth="2" />
      </svg>
      <p className="max-w-sm text-sm text-mut">{line}</p>
      {cta}
    </div>
  );
}
