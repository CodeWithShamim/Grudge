import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Feed } from "@/components/landing/Feed";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Feed />
      <footer className="border-t border-ink-line py-10 text-center font-mono text-[10px] uppercase tracking-widest text-mut">
        every doubt recorded · every receipt public · refereed by GenLayer validator consensus
      </footer>
    </>
  );
}
