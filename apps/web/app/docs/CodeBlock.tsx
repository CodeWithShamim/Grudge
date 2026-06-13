"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A copyable, monospace code block in the GRUDGE ink palette. Client-only for
 * the clipboard interaction; no syntax highlighting dependency — the betting-
 * slip aesthetic favours plain mono with a gold filename tab.
 */
export function CodeBlock({
  children,
  filename,
  className,
}: {
  children: string;
  filename?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked — silently ignore
    }
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-card border border-ink-line bg-ink", className)}>
      <div className="flex items-center justify-between border-b border-ink-line bg-ink-soft px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mut">{filename ?? "shell"}</span>
        <button
          onClick={copy}
          className="font-mono text-[10px] uppercase tracking-widest text-mut transition-colors hover:text-gold"
          aria-label="Copy code"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4">
        <code className="font-mono text-[13px] leading-relaxed text-paper/90">{children.trim()}</code>
      </pre>
    </div>
  );
}
