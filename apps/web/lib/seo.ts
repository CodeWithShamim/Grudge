/**
 * Single source of truth for SEO/AEO metadata. Override the canonical origin
 * with NEXT_PUBLIC_SITE_URL in production (falls back to the Vercel URL, then
 * localhost for dev).
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const SITE = {
  name: "GRUDGE",
  tagline: "your friends bet you'll fail",
  title: "GRUDGE — your friends bet you'll fail",
  description:
    "GRUDGE is a social-accountability game on GenLayer. Stake GEN on a public promise, let doubters bet against you, and let validator-LLM consensus settle whether you kept your word — every receipt on-chain.",
  shortDescription: "Stake on yourself. Let them doubt you publicly. GenLayer validator consensus is the referee.",
  url: SITE_URL,
  twitter: "@genlayer",
  keywords: [
    "GRUDGE",
    "GenLayer",
    "accountability game",
    "onchain bet",
    "prediction market",
    "Intelligent Contract",
    "validator consensus",
    "stake on yourself",
    "commitment contract",
    "social accountability",
    "GEN token",
    "web3 accountability",
  ],
} as const;

/** Absolute URL for a site-relative path (OG/canonical use absolute URLs). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
