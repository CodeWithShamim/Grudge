"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOpenChallenges, useViewer } from "@/lib/chain/hooks";

/**
 * ⌘K command menu: jump to challenge, create, profile, and the chaos button —
 * "doubt a random live challenge".
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: challenges } = useOpenChallenges();
  const { address } = useViewer();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const live = (challenges ?? []).filter((c) => c.status === "ACTIVE");

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      className="fixed left-1/2 top-24 z-[70] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-card bg-ink-soft shadow-e4"
    >
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 -z-10 cursor-default bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}
      <Command.Input
        placeholder="Search the ledger…"
        className="w-full border-b border-ink-line bg-transparent px-4 py-3 text-sm text-paper placeholder:text-mut/60 focus:outline-none"
      />
      <Command.List className="max-h-72 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center font-mono text-xs text-mut">
          Nothing in the ledger matches.
        </Command.Empty>
        <Command.Group heading="Actions" className="px-1 py-1 font-mono text-[10px] uppercase tracking-widest text-mut">
          <Item onSelect={() => go("/create")}>Hold a grudge (create)</Item>
          <Item
            onSelect={() => {
              const pick = live[Math.floor(Math.random() * live.length)];
              if (pick) go(`/challenge/${pick.id}?side=doubt`);
            }}
          >
            🎲 Doubt a random live challenge
          </Item>
          <Item onSelect={() => go(`/profile/${address}`)}>My record</Item>
          <Item onSelect={() => go("/leaderboards")}>Leaderboards</Item>
        </Command.Group>
        <Command.Group heading="Live grudges" className="px-1 py-1 font-mono text-[10px] uppercase tracking-widest text-mut">
          {live.map((c) => (
            <Item key={c.id} onSelect={() => go(`/challenge/${c.id}`)}>
              #{c.id} · {c.statement}
            </Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="cursor-pointer rounded-control px-3 py-2 text-sm normal-case tracking-normal text-paper data-[selected=true]:bg-ink-raised data-[selected=true]:text-gold"
    >
      {children}
    </Command.Item>
  );
}
