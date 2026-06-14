"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { DUR, EASE } from "@/lib/motion/tokens";

/**
 * Email magic-code login in the GRUDGE betting-slip aesthetic. Two beats:
 * enter email → enter the code Privy mails you. No wallet, no seed phrase.
 */
export function LoginScreen({ onDone }: { onDone?: () => void }) {
  const { emailState, sendCode, confirmCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sending = emailState === "sending-code";
  const submitting = emailState === "submitting-code";
  const codeSent = emailState === "awaiting-code" || emailState === "submitting-code";

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await sendCode(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code. Try again.");
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await confirmCode(code.trim());
      onDone?.();
    } catch {
      setError("That code didn't work - check it or request a new one.");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE.outExpo }}
        className="rounded-card border border-ink-line bg-ink-soft p-6 shadow-e3"
      >
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">sign in</p>
        <h2 className="display-statement mb-1 text-display-md text-paper">Put money on yourself</h2>
        <p className="mb-6 font-sans text-sm text-mut">
          {codeSent
            ? `We emailed a code to ${email}. Enter it below.`
            : "Enter your email - we'll send a one-time code. An account and wallet are created for you automatically."}
        </p>

        {!codeSent ? (
          <form onSubmit={submitEmail} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-control border border-ink-line bg-ink px-4 py-3 font-sans text-sm text-paper placeholder:text-mut/50 focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full rounded-control bg-gold px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-transform hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send magic code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-control border border-ink-line bg-ink px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-paper placeholder:tracking-normal placeholder:text-mut/50 focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full rounded-control bg-gold px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-transform hover:bg-gold/90 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Confirm & enter"}
            </button>
            <button
              type="button"
              onClick={() => void sendCode(email)}
              className="w-full font-mono text-[11px] uppercase tracking-widest text-mut hover:text-paper"
            >
              Resend code
            </button>
          </form>
        )}

        {error && <p className="mt-3 font-sans text-xs text-doubt">{error}</p>}
      </motion.div>
    </div>
  );
}
