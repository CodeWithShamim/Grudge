import type { Metadata } from "next";

// internal design-system gallery — never index
export const metadata: Metadata = {
  title: "Component gallery",
  robots: { index: false, follow: false },
};

export default function DevComponentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
