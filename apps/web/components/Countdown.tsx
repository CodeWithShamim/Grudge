"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import { cn, countdownTo } from "@/lib/utils";

/**
 * Live countdown with odometer digits (motion spec #4).
 * Turns doubt-red inside the final 24 hours.
 */
export function Countdown({ endsAt, className }: { endsAt: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { days, hours, minutes, seconds, done } = countdownTo(endsAt, now);
  const urgent = !done && endsAt - now < 24 * 3_600_000;

  if (done) {
    return (
      <span className={cn("font-mono text-sm uppercase tracking-widest text-gold", className)}>
        time&apos;s up — settle it
      </span>
    );
  }

  const Unit = ({ value, label }: { value: number; label: string }) => (
    <span className="inline-flex items-baseline gap-0.5">
      <NumberFlow value={value} format={{ minimumIntegerDigits: 2 }} />
      <span className="text-[0.65em] opacity-60">{label}</span>
    </span>
  );

  return (
    <span
      className={cn(
        "inline-flex gap-2 font-mono tabular-nums",
        urgent ? "text-doubt" : "text-paper",
        className,
      )}
      aria-label={`${days} days ${hours} hours ${minutes} minutes left`}
    >
      <Unit value={days} label="d" />
      <Unit value={hours} label="h" />
      <Unit value={minutes} label="m" />
      <Unit value={seconds} label="s" />
    </span>
  );
}
