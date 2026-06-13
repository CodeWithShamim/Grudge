import type { Metadata } from "next";
import { ExplorerView } from "./ExplorerView";

export const metadata: Metadata = {
  title: "Explorer — GRUDGE",
  description: "Browse every grudge on the public ledger: search, filter by status and category, and sort by pot or deadline.",
};

export default function ExplorerPage() {
  return <ExplorerView />;
}
