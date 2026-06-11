import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * GRUDGE design tokens.
 *
 * Palette: a betting-slip aesthetic — ink surfaces, paper tickets,
 * believer green vs doubter red, gold for payouts.
 * Spacing: 8px grid (Tailwind default scale already aligns; avoid odd values).
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101216",
          soft: "#171a20",
          raised: "#1e222a",
          line: "#2a2f39",
        },
        paper: {
          DEFAULT: "#f5f1e6",
          dim: "#e9e4d5",
        },
        believe: {
          DEFAULT: "#19c37d",
          dim: "#0e7a4e",
          glow: "#2bf09e",
        },
        doubt: {
          DEFAULT: "#ff4d4d",
          dim: "#a32f2f",
          glow: "#ff7a7a",
        },
        gold: {
          DEFAULT: "#ffc24b",
          dim: "#b9852b",
        },
        mut: "#8a8f99",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // 3-tier radius scale
        card: "16px",
        control: "10px",
        chip: "6px",
      },
      boxShadow: {
        // 4-tier elevation, Linear-style: shadow + hairline border baked in via ring
        e1: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        e2: "0 4px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
        e3: "0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        e4: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
        "glow-believe": "0 0 24px rgba(25,195,125,0.35)",
        "glow-doubt": "0 0 24px rgba(255,77,77,0.35)",
      },
      fontSize: {
        // fluid display sizes
        "display-xl": ["clamp(2.5rem, 7vw, 5.5rem)", { lineHeight: "0.95" }],
        "display-lg": ["clamp(1.75rem, 4vw, 3rem)", { lineHeight: "1.0" }],
        "display-md": ["clamp(1.25rem, 2.5vw, 1.875rem)", { lineHeight: "1.05" }],
      },
      keyframes: {
        "stripe-drift": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "28px 0" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        caret: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "stripe-drift": "stripe-drift 1.2s linear infinite",
        breathe: "breathe 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        caret: "caret 1s step-end infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
