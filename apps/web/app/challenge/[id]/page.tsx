import type { Metadata } from "next";
import { ChallengeView } from "@/components/ChallengeView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Grudge #${id} — GRUDGE`,
    openGraph: { images: [`/api/og/challenge/${id}`] },
    twitter: { card: "summary_large_image", images: [`/api/og/challenge/${id}`] },
  };
}

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeView id={id} />;
}
