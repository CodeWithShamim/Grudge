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
    q: "Who decides if I kept my promise?",
    a: "No single person. The GenLayer validator set each runs the contract's judging prompt and reaches consensus on the verdict. The result is recorded on-chain and is publicly auditable.",
  },
  {
    q: "What stops someone faking evidence?",
    a: "The judging prompt evaluates the proof against the grudge's evidence policy, and prompt-injection attempts embedded in evidence are adjudicated by the same consensus and rejected. A verified entry can also be disputed with counter-evidence, which triggers a re-judgement.",
  },
  {
    q: "Do I need GEN to play?",
    a: "To create a grudge or stake you need GEN, since those calls carry value. On GenLayer Studio the network is feeless, so reading and browsing cost nothing. You can fund a Studio account with the simulator's sim_fundAccount method.",
  },
  {
    q: "Can I try GRUDGE without a wallet?",
    a: "Yes. The app ships a zero-config mock mode with seeded grudges so you can play the entire loop locally before connecting to a real network.",
  },
  {
    q: "Why does GRUDGE need GenLayer?",
    a: "The referee is a subjective judgment — does this evidence prove the promise? — that no deterministic smart contract or single oracle can make trustlessly. GenLayer Intelligent Contracts run that judgment inside validator consensus, so the verdict is a consensus artifact rather than one model's opinion.",
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
          articleSection: ["Overview", "How it works", "Why GenLayer", "Verdicts", "Payouts", "FAQ"],
        }}
      />
      <DocsView />
    </>
  );
}
