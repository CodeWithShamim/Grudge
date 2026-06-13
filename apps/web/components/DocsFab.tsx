"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating "Docs" action button, fixed bottom-right across the app. Gold
 * highlight so it reads as the primary help affordance; hidden on /docs itself.
 */
export function DocsFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/docs")) return null;

  return (
    <Link
      href="/docs"
      aria-label="Open documentation"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-control bg-gold px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-e3 ring-1 ring-gold/40 transition-all hover:bg-gold/90 hover:shadow-[0_0_24px_rgba(255,194,75,0.45)] active:scale-[0.97]"
    >
      {/* subtle pulse ring to draw the eye */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping rounded-control bg-gold/30 [animation-duration:2.5s] group-hover:hidden"
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
      Docs
    </Link>
  );
}
