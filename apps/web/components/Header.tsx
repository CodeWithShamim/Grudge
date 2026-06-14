"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { getChainMode } from "@/lib/chain/client";
import { useViewer } from "@/lib/chain/hooks";
import { shortAddress } from "@/lib/utils";

// Email/embedded-wallet account chip only ships in genlayer mode (code-split).
const AccountChip = dynamic(
  () => import("@/components/auth/AccountChip").then((m) => m.AccountChip),
  { ssr: false, loading: () => <div className="skeleton h-9 w-32" /> },
);

export function Header() {
  const mode = getChainMode();
  const { address } = useViewer();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="display-statement text-xl text-paper hover:text-gold">
          GRUDGE<span className="text-doubt">.</span>
        </Link>
        <nav className="hidden items-center gap-5 font-mono text-xs uppercase tracking-widest text-mut sm:flex">
          <Link href="/" className="hover:text-paper">Ledger</Link>
          <Link href="/explorer" className="hover:text-paper">Explorer</Link>
          <Link href="/leaderboards" className="hover:text-paper">Boards</Link>
          <Link href={`/profile/${address}`} className="hover:text-paper">Record</Link>
          <Link href="/docs" className="hover:text-paper">Docs</Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-mut md:inline">⌘K</span>
          <Link
            href="/create"
            className="rounded-control bg-gold px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-e1 transition-transform hover:bg-gold/90 active:scale-[0.97]"
          >
            Hold a grudge
          </Link>
          {mode === "genlayer" ? (
            <AccountChip />
          ) : (
            <span
              title="Mock mode - set NEXT_PUBLIC_CHAIN_MODE=genlayer to use Privy email login"
              className="rounded-control border border-dashed border-mut/50 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-mut"
            >
              {shortAddress(address)} · demo
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
