"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

/**
 * Odometer-style animated GEN amount (motion spec #4). Numbers never snap.
 * Tabular numerals come from the global body rule; mono for the ledger feel.
 */
export function GenAmount({
  value,
  className,
  suffix = " GEN",
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  // keep decimals for small (0.5 GEN) stakes; round larger amounts
  const display = value < 10 ? Math.round(value * 100) / 100 : Math.round(value);
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      <NumberFlow value={display} format={{ maximumFractionDigits: 2 }} />
      <span className="opacity-70">{suffix}</span>
    </span>
  );
}
