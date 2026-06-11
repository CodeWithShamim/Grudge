import { Hero } from "@/components/landing/Hero";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { Feed } from "@/components/landing/Feed";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ScrollStory />
      <Feed />
      <footer className="border-t border-ink-line py-10 text-center font-mono text-[10px] uppercase tracking-widest text-mut">
        every doubt recorded · every receipt public · refereed by GenLayer validator consensus
      </footer>
    </>
  );
}
