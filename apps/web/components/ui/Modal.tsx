"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DUR, SPRING } from "@/lib/motion/tokens";
import { useReducedMotionSafe } from "@/lib/motion/useReducedMotionSafe";

/**
 * Responsive modal: bottom sheet on mobile (thumb zone), centered dialog on
 * desktop. Traps focus, closes on Escape/backdrop, sets aria-modal.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { prefersReduced } = useReducedMotionSafe();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("input, textarea, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel) {
        // minimal focus trap
        const focusables = panel.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.fast }}
        >
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={prefersReduced ? { opacity: 0 } : { y: "30%", opacity: 0 }}
            animate={prefersReduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { y: "20%", opacity: 0 }}
            transition={prefersReduced ? { duration: 0.12 } : { ...SPRING.snappy }}
            className={cn(
              "grain relative w-full max-w-lg rounded-t-card bg-ink-soft p-6 shadow-e4 sm:rounded-card",
              className,
            )}
            style={{ willChange: "transform" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-widest text-mut">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-chip px-2 py-1 font-mono text-xs text-mut hover:bg-ink-raised hover:text-paper"
              >
                ESC
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
