/**
 * GRUDGE motion tokens — the single source of truth for all motion.
 * No component may use inline duration/easing magic numbers; import from here.
 */

/** Durations in seconds (Framer Motion convention). */
export const DUR = {
  instant: 0.08,
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
  cinematic: 0.8,
} as const;

/** Durations in milliseconds, for CSS / GSAP / timers. */
export const DUR_MS = {
  instant: 80,
  fast: 160,
  base: 240,
  slow: 400,
  cinematic: 800,
} as const;

/** Easing curves. */
export const EASE = {
  /** Entrances: fast start, long luxurious settle. */
  outExpo: [0.16, 1, 0.3, 1] as const,
  /** Layout moves between resting states. */
  inOutQuart: [0.76, 0, 0.24, 1] as const,
} as const;

/** Spring presets. */
export const SPRING = {
  /** Buttons, stamps, chips — crisp and immediate. */
  snappy: { type: "spring", stiffness: 420, damping: 30 } as const,
  /** Tug-of-war, pools — weighty, slight overshoot. */
  heavy: { type: "spring", stiffness: 120, damping: 18 } as const,
} as const;

/** List/feed stagger: 40ms between children, 12px y-offset. */
export const STAGGER = {
  step: 0.04,
  yOffset: 12,
} as const;

/** Validator arc flip stagger (signature moment #3). */
export const VALIDATOR_FLIP_STAGGER_MS = 120;

/** Reduced-motion fallback: everything becomes a <=120ms fade. */
export const REDUCED = {
  duration: 0.12,
} as const;
