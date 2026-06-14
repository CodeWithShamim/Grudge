import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a grudge",
  description:
    "Stake GEN on a concrete, time-boxed promise. Set the evidence policy and let validator consensus referee whether you keep your word.",
  alternates: { canonical: "/create" },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
