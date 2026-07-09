"use client";

import { useReputation } from "@/lib/chain/hooks";
import { cn } from "@/lib/utils";

/**
 * F4 conviction rating badge. Two flavours:
 *  - kind="creator"  → "Conviction NN" (kept-promise rating)
 *  - kind="doubter"  → "Right NN% of the time" (doubter accuracy)
 *
 * Reads on-chain reputation; renders nothing while loading or for an address
 * with no settled history (a 0 score on no record is noise, not signal).
 */

function scoreColor(score: number): string {
  if (score >= 70) return "text-believe";
  if (score >= 40) return "text-gold";
  return "text-doubt";
}

export function ConvictionBadge({
  address,
  kind = "creator",
  className,
}: {
  address: string;
  kind?: "creator" | "doubter";
  className?: string;
}) {
  const { data, isLoading } = useReputation(address);
  if (isLoading || !data) return null;

  if (kind === "doubter") {
    if (data.doubtsMade === 0) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest",
          scoreColor(data.doubterAccuracy),
          className,
        )}
        title={`Right on ${data.doubtsCorrect}/${data.doubtsMade} settled doubts`}
      >
        ◎ right {data.doubterAccuracy}% of the time
      </span>
    );
  }

  if (data.challengesCreated === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-chip border border-current/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        scoreColor(data.convictionScore),
        className,
      )}
      title={`Kept ${data.challengesWon}/${data.challengesCreated} promises`}
    >
      ⬣ conviction {data.convictionScore}
    </span>
  );
}
