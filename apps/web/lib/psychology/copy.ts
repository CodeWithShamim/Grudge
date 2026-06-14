import type { Challenge } from "../chain/types";
import { shortAddress } from "../utils";

/**
 * The GRUDGE psychology engine - pure, deterministic, unit-tested copy.
 *
 * Voice: a grudge ledger. Playful trash-talk, never abusive. No
 * body-shaming, no harassment, profanity-free. Every line should make
 * someone want to screenshot it.
 */

/** Pool-ratio bands -> odds line. doubt/(believe+self) ratio. */
export function oddsLine(c: Pick<Challenge, "believerPool" | "doubterPool" | "selfStake">): string {
  const backing = c.believerPool + c.selfStake;
  const against = c.doubterPool;
  if (against === 0 && backing === 0) return "No money on the table. Yet.";
  if (against === 0) return "Nobody dares to doubt. Suspicious.";
  const ratio = against / Math.max(backing, 1);
  const amt = Math.round(against).toLocaleString("en-US");
  if (ratio >= 3) return `${amt} GEN says this is a fantasy.`;
  if (ratio >= 1.5) return `${amt} GEN is betting on collapse.`;
  if (ratio >= 0.75) return `${amt} GEN says they fold. Dead heat.`;
  if (ratio >= 0.25) return `${amt} GEN of doubt - the believers are winning.`;
  return `Only ${amt} GEN of doubt. Cowards, or smart money?`;
}

/** Streak nudge shown to the challenger. */
export function streakNudge(c: Pick<Challenge, "verifiedCount" | "stakes">): string {
  const day = c.verifiedCount;
  const topDoubt = [...c.stakes]
    .filter((s) => s.side === "doubt")
    .sort((a, b) => b.amount - a.amount)[0];
  if (day === 0) return "Day zero. The ledger is watching.";
  if (!topDoubt) return `Day ${day}. Quiet doubters are still doubters.`;
  const who = shortAddress(topDoubt.address);
  const amt = Math.round(topDoubt.amount).toLocaleString("en-US");
  if (day < 5) return `Day ${day}. ${who}'s ${amt} GEN isn't worried. Yet.`;
  if (day < 15) return `Day ${day}. ${who}'s ${amt} GEN is getting nervous.`;
  return `Day ${day}. ${who}'s ${amt} GEN is sweating through the ledger.`;
}

/** Banner when evidence gets REJECTED - blood in the water for doubters. */
export function rejectionBanner(creatorName: string): string {
  return `${creatorName} just had evidence REJECTED. The doubters smell blood.`;
}

/** Deadline-pressure tiers. */
export function deadlinePressure(msLeft: number): string {
  const hours = msLeft / 3_600_000;
  if (msLeft <= 0) return "Time's up. Someone is about to get paid.";
  if (hours <= 6) return "Hours left. The ledger is sharpening its pen.";
  if (hours <= 24) return "Final day. Every doubter is refreshing this page.";
  if (hours <= 72) return "Three days. This is where promises usually die.";
  const days = Math.ceil(hours / 24);
  return `${days} days left. Plenty of time to fail.`;
}

/** Share captions per event type. */
export function shareCaption(
  event: "created" | "doubted" | "verified" | "rejected" | "won" | "calledIt",
  c: Pick<Challenge, "statement" | "doubterPool">,
): string {
  const doubt = Math.round(c.doubterPool).toLocaleString("en-US");
  switch (event) {
    case "created":
      return `I just put money on myself: "${c.statement}". Come doubt me. I dare you.`;
    case "doubted":
      return `I just bet against "${c.statement}". Easiest GEN of my life.`;
    case "verified":
      return `Proof submitted. Validators agreed. ${doubt} GEN of doubt is getting nervous.`;
    case "rejected":
      return `Their "evidence" got REJECTED by consensus. The doubters were right.`;
    case "won":
      return `"${c.statement}" - DONE. ${doubt} GEN of doubt, collected. Receipts are public.`;
    case "calledIt":
      return `Called it. "${c.statement}" - broken. My receipt is on the ledger forever.`;
  }
}

/** Empty-state lines. */
export const EMPTY_STATES = {
  feed: "No grudges yet. Start one - or doubt someone braver.",
  evidence: "No proof yet. The doubters are getting comfortable.",
  doubters: "Nobody has doubted this. Be the first villain.",
  receipts: "No receipts. You haven't called anyone's bluff yet.",
} as const;

/** Taunt placeholder rotation for the doubt-side stake form. */
export const TAUNT_PLACEHOLDERS = [
  "Say it to their face. Publicly. Forever.",
  "This goes on the permanent record.",
  "Make it sting (keep it clean).",
] as const;
