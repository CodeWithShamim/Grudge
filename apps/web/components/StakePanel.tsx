"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn, hapticTap } from "@/lib/utils";
import { EASE, DUR } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import { useStake, useViewer } from "@/lib/chain/hooks";
import { TAUNT_PLACEHOLDERS } from "@/lib/psychology/copy";
import { MIN_STAKE_GEN, type Challenge, type Side } from "@/lib/chain/types";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

// testnet-friendly: smallest preset is the 0.5 GEN minimum
const PRESETS = [0.5, 1, 5, 25];

/**
 * Stake modal + signature moment #5: on confirm, the staked amount detaches
 * as a chip and flies into the believer/doubter side of the tug bar, landing
 * with squash-and-stretch. The optimistic pool update fires while the tx is
 * pending; rollback is handled in useStake.
 */
export function StakePanel({
  challenge,
  open,
  initialSide,
  onClose,
}: {
  challenge: Challenge;
  open: boolean;
  initialSide: Side;
  onClose: () => void;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState<number>(1);
  const [custom, setCustom] = useState("");
  const [taunt, setTaunt] = useState("");
  const [flyingChip, setFlyingChip] = useState<{ amount: number; side: Side } | null>(null);
  const stake = useStake(challenge.id);
  const { isDemo } = useViewer();
  const { prefersReduced } = useReducedMotionSafe();

  const isCreator = false; // creator-side guard enforced by the contract & client
  const effectiveAmount = custom ? Number(custom) : amount;
  const valid = Number.isFinite(effectiveAmount) && effectiveAmount >= MIN_STAKE_GEN;
  const stakingCloses = challenge.startsAt + (challenge.endsAt - challenge.startsAt) * 0.25;
  const windowClosed = Date.now() > stakingCloses;

  const commit = () => {
    if (!valid) return;
    hapticTap();
    if (!prefersReduced) setFlyingChip({ amount: effectiveAmount, side });
    stake.mutate(
      { side, amount: effectiveAmount, taunt: side === "doubt" && taunt ? taunt : undefined },
      { onSettled: () => setTimeout(() => setFlyingChip(null), 900) },
    );
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Stake on #${challenge.id}`}>
        <div className="space-y-5">
          {/* side toggle */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pick a side">
            {(["believe", "doubt"] as const).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "rounded-control border-2 px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-colors",
                  side === s
                    ? s === "believe"
                      ? "border-believe bg-believe/15 text-believe"
                      : "border-doubt bg-doubt/15 text-doubt"
                    : "border-ink-line text-mut hover:border-mut",
                )}
              >
                {s === "believe" ? "They'll do it" : "They'll fold"}
              </button>
            ))}
          </div>

          {/* amount */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mut">Amount (GEN)</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                  aria-pressed={!custom && amount === p}
                  className={cn(
                    "rounded-control border px-4 py-2 font-mono text-sm tabular-nums transition-colors",
                    !custom && amount === p
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-ink-line text-paper hover:border-mut",
                  )}
                >
                  {p}
                </button>
              ))}
              <input
                inputMode="decimal"
                placeholder={`min ${MIN_STAKE_GEN}`}
                value={custom}
                onChange={(e) => {
                  // digits + a single decimal point (0.5 GEN minimum stake)
                  const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                  const firstDot = cleaned.indexOf(".");
                  setCustom(
                    firstDot === -1
                      ? cleaned
                      : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, ""),
                  );
                }}
                aria-label={`Custom amount in GEN, minimum ${MIN_STAKE_GEN}`}
                className="w-24 rounded-control border border-ink-line bg-ink px-3 py-2 font-mono text-sm tabular-nums text-paper placeholder:text-mut/60 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* taunt — doubt side only */}
          <AnimatePresence initial={false}>
            {side === "doubt" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE.outExpo }}
                className="overflow-hidden"
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-mut">
                  Attach a taunt — it goes on the public record
                </p>
                <textarea
                  value={taunt}
                  onChange={(e) => setTaunt(e.target.value.slice(0, 140))}
                  placeholder={TAUNT_PLACEHOLDERS[0]}
                  rows={2}
                  className="w-full resize-none rounded-control border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-mut/60 focus:border-doubt focus:outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {windowClosed ? (
            <p className="font-mono text-xs text-gold">Staking window closed — odds are locked.</p>
          ) : (
            <Button
              variant={side === "believe" ? "believe" : "doubt"}
              size="lg"
              className="w-full"
              disabled={!valid || isCreator}
              loading={stake.isPending}
              onClick={commit}
            >
              {side === "believe"
                ? `Back them with ${valid ? effectiveAmount : "—"} GEN`
                : `Bet ${valid ? effectiveAmount : "—"} GEN they fail`}
            </Button>
          )}
          {isDemo && (
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-mut">
              demo wallet · mock chain
            </p>
          )}
        </div>
      </Modal>

      {/* signature #5: the flying chip */}
      <AnimatePresence>
        {flyingChip && (
          <motion.div
            key="chip"
            initial={{ opacity: 1, scale: 1, x: "-50%", top: "60%", left: "50%" }}
            animate={{
              top: "22%",
              left: flyingChip.side === "believe" ? "18%" : "82%",
              scale: [1, 1.1, 0.85, 1.05, 1],
              opacity: [1, 1, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE.inOutQuart }}
            className={cn(
              "pointer-events-none fixed z-[60] rounded-full px-4 py-2 font-mono text-sm font-bold shadow-e3",
              flyingChip.side === "believe" ? "bg-believe text-ink" : "bg-doubt text-paper",
            )}
            style={{ willChange: "transform, opacity" }}
            aria-hidden
          >
            {flyingChip.amount} GEN
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
