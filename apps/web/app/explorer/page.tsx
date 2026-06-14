import type { Metadata } from "next";
import { ExplorerView } from "./ExplorerView";

export const metadata: Metadata = {
  title: "Explorer",
  description: "Browse every grudge on the public ledger: search, filter by status and category, and sort by pot or deadline.",
  alternates: { canonical: "/explorer" },
};

export default function ExplorerPage() {
  return <ExplorerView />;
}
