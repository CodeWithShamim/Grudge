"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAuthGate } from "./AuthGate";
import { explorerAddressUrl } from "@/lib/chain/bradbury";
import { shortAddress } from "@/lib/utils";

/**
 * Header account control. Replaces RainbowKit's ConnectButton:
 *  - signed out → "Sign in" (opens the email login modal via AuthGate)
 *  - signed in  → email/address chip + menu (copy, explorer, export, logout)
 */
export function AccountChip() {
  const { session, provisioning, logout, exportWallet } = useAuth();
  const { requireAuth } = useAuthGate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  if (provisioning) {
    return (
      <span className="flex items-center gap-2 rounded-control border border-ink-line bg-ink-soft px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-mut">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
        Setting up wallet…
      </span>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => requireAuth()}
        className="rounded-control bg-gold px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-e1 transition-transform hover:bg-gold/90 active:scale-[0.97]"
      >
        Sign in
      </button>
    );
  }

  const label = session.email ?? shortAddress(session.address);

  const copy = async () => {
    await navigator.clipboard.writeText(session.address);
    toast.success("Address copied");
    setMenuOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-control border border-ink-line bg-ink-soft px-3 py-2 font-mono text-xs text-paper transition-colors hover:border-mut/50"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-believe" />
        <span className="max-w-[160px] truncate">{label}</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card border border-ink-line bg-ink-soft shadow-e3">
          <div className="border-b border-ink-line px-4 py-3">
            <p className="truncate font-mono text-[11px] text-mut">{session.email}</p>
            <p className="mt-0.5 font-mono text-[11px] text-paper">{shortAddress(session.address)}</p>
          </div>
          <MenuItem onClick={copy}>Copy address</MenuItem>
          <MenuItem
            onClick={() => {
              window.open(explorerAddressUrl(session.address), "_blank");
              setMenuOpen(false);
            }}
          >
            View on explorer ↗
          </MenuItem>
          <MenuItem
            onClick={() => {
              void exportWallet();
              setMenuOpen(false);
            }}
          >
            Export wallet
          </MenuItem>
          <MenuItem
            danger
            onClick={() => {
              void logout();
              setMenuOpen(false);
            }}
          >
            Log out
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left font-mono text-xs uppercase tracking-widest transition-colors hover:bg-ink-raised ${
        danger ? "text-doubt" : "text-mut hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}
