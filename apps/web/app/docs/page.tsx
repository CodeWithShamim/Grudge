import type { Metadata } from "next";
import { DocsView } from "./DocsView";

export const metadata: Metadata = {
  title: "Docs — GRUDGE",
  description:
    "How GRUDGE works: stake on a promise, let doubters bet against you, and let GenLayer validator consensus settle the truth.",
};

export default function DocsPage() {
  return <DocsView />;
}
