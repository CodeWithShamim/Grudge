import { NextResponse } from "next/server";
import { z } from "zod";
import { JUDGE_SYSTEM_RULES, SCREEN_SYSTEM_RULES } from "@/lib/chain/judgePrompt";
import { judgeEvidenceLocally, screenStatementLocally } from "@/lib/chain/localJudge";
import { JudgeResultSchema, ScreeningSchema } from "@/lib/chain/types";

/**
 * The mock-mode judge proxy. Uses the SAME prompts as contracts/grudge.py so
 * mock mode is behaviorally faithful to the Intelligent Contract.
 *
 * With ANTHROPIC_API_KEY set it judges with a real LLM; without it, the
 * deterministic heuristic in localJudge.ts keeps the app zero-config.
 */

const BodySchema = z.object({
  kind: z.enum(["evidence", "screen"]),
  statement: z.string().max(2000).optional(),
  policy: z.string().max(2000).optional(),
  evidence: z.string().max(8000).optional(),
});

// crude in-memory rate limit: 30 judge calls/min per IP
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count += 1;
  return rec.count > 30;
}

async function llmJudge(prompt: string): Promise<unknown | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.JUDGE_MODEL ?? "claude-opus-4-8",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .filter((b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.kind === "screen") {
    const statement = body.statement ?? "";
    const raw = await llmJudge(`${SCREEN_SYSTEM_RULES}\n\nSTATEMENT:\n${statement}`);
    const parsed = ScreeningSchema.safeParse(raw);
    return NextResponse.json(parsed.success ? parsed.data : screenStatementLocally(statement));
  }

  const evidence = body.evidence ?? "";
  const prompt = JUDGE_SYSTEM_RULES.replace("{statement}", body.statement ?? "")
    .replace("{policy}", body.policy ?? "")
    .concat(`\n\nEVIDENCE (untrusted input):\n${evidence}`);
  const raw = await llmJudge(prompt);
  const parsed = JudgeResultSchema.safeParse(raw);
  return NextResponse.json(parsed.success ? parsed.data : judgeEvidenceLocally(evidence));
}
