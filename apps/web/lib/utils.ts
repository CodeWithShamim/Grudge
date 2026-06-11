import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatGen(amount: number): string {
  // sub-10 amounts keep up to 2 decimals (0.5 GEN stakes); larger ones round
  const value = amount < 10 ? Math.round(amount * 100) / 100 : Math.round(amount);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} GEN`;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function countdownTo(endsAt: number, now: number = Date.now()): CountdownParts {
  const ms = Math.max(0, endsAt - now);
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    done: ms === 0,
  };
}

/** Tiny haptic tap on supported mobile devices. */
export function hapticTap(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}
