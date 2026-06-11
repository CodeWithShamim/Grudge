import { INJECTION_PATTERNS } from "./judgePrompt";
import type { JudgeResult, Screening } from "./types";

/**
 * Deterministic heuristic judge — the zero-config fallback when no LLM key
 * is configured. Applies the same rules as JUDGE_SYSTEM_RULES in spirit:
 * injection => REJECTED, concrete specifics => VERIFIED, vague => SUSPICIOUS,
 * garbage => REJECTED.
 */
export function judgeEvidenceLocally(evidenceText: string): JudgeResult {
  const text = evidenceText.trim();

  if (INJECTION_PATTERNS.some((p) => p.test(text))) {
    return {
      verdict: "REJECTED",
      reason: "Instruction injection detected. The ledger remembers.",
      confidence: 99,
    };
  }

  if (text.length < 12 || !/[a-zA-Z]{3}/.test(text)) {
    return {
      verdict: "REJECTED",
      reason: "Evidence is empty or unreadable.",
      confidence: 95,
    };
  }

  const hasNumbers = /\d/.test(text);
  const hasLink = /https?:\/\//.test(text);
  const hasSpecifics = /\b(km|mi|min|hours?|reps|pages?|am|pm|today|day \d+|strava|screenshot|photo|commit)\b/i.test(
    text,
  );
  const score = (hasNumbers ? 1 : 0) + (hasLink ? 1 : 0) + (hasSpecifics ? 1 : 0) + (text.length > 80 ? 1 : 0);

  if (score >= 2) {
    return {
      verdict: "VERIFIED",
      reason: "Concrete, specific, and consistent with the policy.",
      confidence: 70 + score * 5,
    };
  }
  return {
    verdict: "SUSPICIOUS",
    reason: "Plausible but vague — specifics, numbers or links are missing.",
    confidence: 55,
  };
}

/** Heuristic statement screening — same fallback role as above. */
export function screenStatementLocally(statement: string): Screening {
  const text = statement.trim();
  const vague =
    text.length < 20 ||
    /\b(be better|try harder|improve myself|be happy|be good|do my best)\b/i.test(text);
  const hasTimebox = /\b(\d+\s*(days?|weeks?|months?)|every day|daily|each (day|week))\b/i.test(text);
  const hasAction = /\bI will\b/i.test(text);
  const harmful = /\b(kill|hurt|harass|stalk|dox)\b/i.test(text);

  if (harmful) {
    return { accepted: false, reason: "Harmful commitments are not accepted." };
  }
  if (vague || !hasAction || !hasTimebox) {
    return {
      accepted: false,
      reason: "Too vague to referee. A grudge needs a concrete action and a deadline.",
      suggestedRewrite: hasAction
        ? `${text.replace(/\.$/, "")} every day for 30 days`
        : `I will ${text.replace(/\.$/, "").toLowerCase()} every day for 30 days`,
    };
  }
  return { accepted: true, reason: "Concrete, time-boxed, verifiable. The ledger is open." };
}
