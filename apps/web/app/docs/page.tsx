import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { DocsView } from "./DocsView";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How GRUDGE works: stake on a promise, let doubters bet against you, and let GenLayer validator consensus settle the truth.",
  alternates: { canonical: "/docs" },
};

/**
 * Plain-text FAQ mirrored from DocsView's FAQ section — the source answer
 * engines (Google AI, Perplexity, ChatGPT) extract and cite. Keep in sync with
 * the rendered FAQ in DocsView.tsx.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What is GRUDGE?",
    a: "GRUDGE is a social-accountability game on GenLayer. You stake GEN on a concrete, time-boxed promise; believers stake that you'll keep it and doubters stake that you won't; you submit evidence; and GenLayer validator-LLM consensus settles the verdict. The contract pays the winning side automatically.",
  },
  {
    q: "How do I sign in to GRUDGE?",
    a: "With your email. You enter your email address, type the one-time code that's sent to you, and an on-chain wallet is created for you automatically. There's no browser extension and no seed phrase to manage.",
  },
  {
    q: "Do I have to confirm every transaction?",
    a: "No. GRUDGE provisions an embedded wallet whose key is securely custodied, so it signs transactions silently. Creating a grudge, staking, submitting evidence, settling, and claiming all happen without a wallet popup or fee confirmation.",
  },
  {
    q: "Who decides if I kept my promise?",
    a: "No single person. The GenLayer validator set each runs the contract's judging prompt and reaches consensus on the verdict. The result is recorded on-chain and is publicly auditable.",
  },
  {
    q: "What stops someone faking evidence?",
    a: "The judging prompt evaluates the proof against the grudge's evidence policy, and prompt-injection attempts embedded in evidence are adjudicated by the same consensus and rejected. A verified entry can also be disputed with counter-evidence, which triggers a re-judgement.",
  },
  {
    q: "What if I think a rejection was wrong?",
    a: "You can appeal it. The appeal_verdict method bonds some GEN and triggers a fresh GenLayer consensus round that re-judges the proof on its merits. If the panel flips the verdict to VERIFIED, your bond is returned and the proof counts; if the rejection is upheld, the bond is forfeited to the doubter pool. Each proof can be appealed once.",
  },
  {
    q: "What is a conviction rating?",
    a: "GRUDGE keeps an on-chain reputation for each address derived from kept-versus-broken history, plus how often a doubter's bets were right. The conviction_score and doubter_accuracy are computed deterministically (no LLM) with a volume dampener, so a high rating must be earned over many grudges rather than a single lucky result. It's shown next to creators and doubters across the app.",
  },
  {
    q: "Do I need GEN to play?",
    a: "To create a grudge or stake you need GEN, since those calls carry value. On GenLayer Studio your embedded wallet is auto-funded with simulated GEN the first time it's empty, so you start ready to act. Reading and browsing the ledger cost nothing and require no sign-in.",
  },
  {
    q: "Can I try GRUDGE without signing in?",
    a: "Yes. The app ships a zero-config mock mode with seeded grudges so you can play the entire loop locally before connecting to a real network.",
  },
  {
    q: "Why does GRUDGE need GenLayer?",
    a: "The referee is a subjective judgment - does this evidence prove the promise? - that no deterministic smart contract or single oracle can make trustlessly. GenLayer Intelligent Contracts run that judgment inside validator consensus, so the verdict is a consensus artifact rather than one model's opinion.",
  },
];

export default function DocsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "How GRUDGE works",
          description:
            "Stake on a promise, let doubters bet against you, and let GenLayer validator consensus settle the truth.",
          url: absoluteUrl("/docs"),
          articleSection: ["Overview", "How it works", "Why GenLayer", "Verdicts", "Payouts", "Roadmap", "FAQ"],
        }}
      />
      <DocsView />
    </>
  );
}
