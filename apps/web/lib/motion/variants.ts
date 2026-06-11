import type { Variants, Transition } from "framer-motion";
import { DUR, EASE, SPRING, STAGGER, REDUCED } from "./tokens";

/** Standard entrance: fade + 12px rise, easeOutExpo. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: STAGGER.yOffset },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE.outExpo },
  },
};

/** Parent container that staggers `fadeRise` children at 40ms. */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER.step } },
};

/** Shared-axis slide for wizard steps. direction: 1 forward, -1 back. */
export const sharedAxis = (direction: 1 | -1): Variants => ({
  enter: { x: direction * 32, opacity: 0 },
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: DUR.base, ease: EASE.outExpo },
  },
  exit: {
    x: direction * -32,
    opacity: 0,
    transition: { duration: DUR.fast, ease: EASE.inOutQuart },
  },
});

/** VerdictStamp slam: 1.6 -> 1 scale with random rotation, snappy spring. */
export const stampSlam = (rotate: number): Variants => ({
  hidden: { opacity: 0, scale: 1.6, rotate },
  visible: {
    opacity: 1,
    scale: 1,
    rotate,
    transition: { ...SPRING.snappy },
  },
});

/** Pending validator node pulse (used while "thinking"). */
export const validatorThinking: Variants = {
  thinking: {
    scale: [1, 1.12, 1],
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Button press micro-interaction. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: SPRING.snappy satisfies Transition,
} as const;

/** Doubter taunt pop-in with a small shake. */
export const tauntPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: [0, -2, 2, -1, 0],
    transition: { duration: DUR.slow, ease: EASE.outExpo },
  },
};

/** Settle loss: cold blue wash. */
export const coldWash: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.cinematic, ease: "easeOut" } },
};

/** Receipt cards dealing out with stagger. */
export const receiptDeal: Variants = {
  hidden: { opacity: 0, y: -40, rotate: -6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: (i % 2 === 0 ? 1 : -1) * 1.5,
    transition: { ...SPRING.snappy, delay: i * 0.12 },
  }),
};

/** Reduced-motion replacement: plain <=120ms fade. */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: REDUCED.duration } },
};
