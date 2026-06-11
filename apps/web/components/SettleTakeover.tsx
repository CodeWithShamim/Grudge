"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { cn, shortAddress } from "@/lib/utils";
import { DUR, EASE } from "@/lib/motion/tokens";
import { coldWash, receiptDeal } from "@/lib/motion/variants";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";
import type { Challenge, SettleResult } from "@/lib/chain/types";
import { GenAmount } from "./ui/GenAmount";
import { Button } from "./ui/Button";

/**
 * Signature moment #6 — the settle takeover.
 * Win: the ticket tears along its perforation (clip-path), a 1.2s gold
 * confetti burst fires (then stops), payouts count up.
 * Loss: cold blue wash; "Called It" receipts deal out like cards.
 */
export function SettleTakeover({
  challenge,
  result,
  onDismiss,
}: {
  challenge: Challenge;
  result: SettleResult;
  onDismiss: () => void;
}) {
  const { prefersReduced } = useReducedMotionSafe();
  const won = result.outcome === "SUCCEEDED";

  useEffect(() => {
    if (!won || prefersReduced) return;
    let stopped = false;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (stopped) return;
      const end = Date.now() + 1200;
      const frame = () => {
        if (stopped || Date.now() > end) return;
        confetti({
          particleCount: 24,
          spread: 70,
          startVelocity: 42,
          colors: ["#ffc24b", "#f5f1e6", "#19c37d"],
          origin: { y: 0.4 },
        });
        setTimeout(frame, 180);
      };
      frame();
    });
    return () => {
      stopped = true;
    };
  }, [won, prefersReduced]);

  return (
    <AnimatePresence>
      <motion.div
        key="takeover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DUR.slow }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4",
          won ? "bg-ink/95" : "bg-[#0a1422]/97",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={won ? "Challenge succeeded" : "Challenge failed"}
      >
        {!won && (
          <motion.div variants={coldWash} initial="hidden" animate="visible" className="absolute inset-0 bg-gradient-to-b from-[#10243f]/60 to-transparent" aria-hidden />
        )}

        <div className="relative w-full max-w-xl text-center">
          {won ? (
            <>
              {/* the torn ticket */}
              <motion.div
                initial={prefersReduced ? { opacity: 0 } : { clipPath: "inset(0 0 0 0)" }}
                animate={
                  prefersReduced
                    ? { opacity: 1 }
                    : { clipPath: ["inset(0 0 0 0)", "inset(0 0 52% 0)"], y: [0, -12] }
                }
                transition={{ duration: DUR.cinematic, ease: EASE.inOutQuart, delay: 0.3 }}
                className="grain relative mx-auto mb-2 max-w-md rounded-card bg-paper p-6 text-ink shadow-e4"
              >
                <p className="display-statement text-display-md">{challenge.statement}</p>
                <div className="perforation mt-4 h-3 w-full" aria-hidden />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: DUR.slow, ease: EASE.outExpo }}
                className="display-statement mb-6 text-display-lg text-gold"
              >
                Promise kept. Pay up.
              </motion.h2>
            </>
          ) : (
            <motion.h2
              variants={coldWash}
              initial="hidden"
              animate="visible"
              className="display-statement mb-6 text-display-lg text-[#7ea4d4]"
            >
              They called it.
            </motion.h2>
          )}

          {/* payouts / receipts */}
          <div className={cn("mb-8 space-y-2", !won && "flex flex-wrap justify-center gap-3 space-y-0")}>
            {result.payouts.slice(0, 6).map((p, i) =>
              won ? (
                <motion.div
                  key={p.address}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.08, duration: DUR.base, ease: EASE.outExpo }}
                  className="flex items-center justify-between rounded-control bg-ink-soft px-4 py-2 shadow-e1"
                >
                  <span className="font-mono text-xs text-mut">{shortAddress(p.address)}</span>
                  <GenAmount value={p.amount} className="text-believe" />
                </motion.div>
              ) : (
                <motion.div
                  key={p.address}
                  custom={i}
                  variants={receiptDeal}
                  initial="hidden"
                  animate="visible"
                  className="grain relative w-40 rounded-card bg-paper p-3 text-left text-ink shadow-e3"
                >
                  <p className="font-display text-lg uppercase italic leading-none">Called it</p>
                  <p className="mt-1 truncate font-mono text-[10px]">{shortAddress(p.address)}</p>
                  <GenAmount value={p.amount} className="text-sm font-bold" />
                  <div className="perforation mt-2 h-2 w-full opacity-40" aria-hidden />
                </motion.div>
              ),
            )}
          </div>

          <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-mut">
            rake {result.rake} GEN · tx {result.txHash.slice(0, 10)}…
          </p>
          <Button variant={won ? "primary" : "ghost"} onClick={onDismiss}>
            Back to the ledger
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
