"use client";

import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { reducedFade } from "./variants";

/**
 * The single gate for reduced motion across the app.
 *
 * Returns `prefersReduced` plus a `pick` helper that swaps any expressive
 * variant set for a <=120ms fade when the user prefers reduced motion.
 * Components must route ALL signature motion through this hook.
 */
export function useReducedMotionSafe(): {
  prefersReduced: boolean;
  pick: (full: Variants) => Variants;
} {
  const prefersReduced = useReducedMotion() ?? false;
  return {
    prefersReduced,
    pick: (full: Variants) => (prefersReduced ? reducedFade : full),
  };
}
