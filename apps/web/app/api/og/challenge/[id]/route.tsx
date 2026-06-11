import { ImageResponse } from "next/og";
import { seedChallenges } from "@/lib/chain/mock";
import { oddsLine } from "@/lib/psychology/copy";

export const runtime = "edge";

/**
 * 1200x630 share ticket. Every link unfurls as a provocation: the statement,
 * the tug bar, the odds line, the URL.
 *
 * Data source: in mock mode the deterministic seed; in genlayer mode the
 * indexer is the future read path — unknown ids fall back to a generic card.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = seedChallenges(Date.now()).find((c) => c.id === id);

  const statement = challenge?.statement ?? "Someone is about to be proven wrong.";
  const believe = (challenge?.believerPool ?? 0) + (challenge?.selfStake ?? 0);
  const doubt = challenge?.doubterPool ?? 0;
  const total = believe + doubt || 1;
  const believePct = Math.round((believe / total) * 100);
  const odds = challenge ? oddsLine(challenge) : "The ledger is open.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#101216",
          padding: 64,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#f5f1e6", fontSize: 36, fontStyle: "italic", fontWeight: 900, letterSpacing: -1 }}>
            GRUDGE<span style={{ color: "#ff4d4d" }}>.</span>
          </span>
          <span style={{ color: "#8a8f99", fontSize: 20, textTransform: "uppercase", letterSpacing: 4 }}>
            grudge #{id} · public record
          </span>
        </div>

        <div
          style={{
            color: "#f5f1e6",
            fontSize: 64,
            fontWeight: 900,
            fontStyle: "italic",
            textTransform: "uppercase",
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {statement}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ color: "#ffc24b", fontSize: 28 }}>{odds}</span>
          <div style={{ display: "flex", height: 28, width: "100%", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ width: `${believePct}%`, backgroundColor: "#19c37d", display: "flex" }} />
            <div style={{ flex: 1, backgroundColor: "#ff4d4d", display: "flex" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#19c37d", fontSize: 22 }}>BELIEVERS · {Math.round(believe)} GEN</span>
            <span style={{ color: "#ff4d4d", fontSize: 22 }}>{Math.round(doubt)} GEN · DOUBTERS</span>
          </div>
          <span style={{ color: "#8a8f99", fontSize: 20 }}>your friends bet you&apos;ll fail · grudge.game</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
