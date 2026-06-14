import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded social/AEO preview card in the GRUDGE betting-slip palette.
 * Note: Satori (next/og) requires EVERY multi-child div to set display:flex.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #101216 0%, #171a20 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#ffc24b", fontStyle: "italic" }}>
            GRUDGE
          </div>
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: "#ff4d4d" }} />
        </div>

        {/* headline + subhead */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 800,
              color: "#f5f1e6",
              lineHeight: 1.02,
              fontStyle: "italic",
              textTransform: "uppercase",
              letterSpacing: "-2px",
            }}
          >
            Your friends bet you&apos;ll fail.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#8a8f99", maxWidth: 920 }}>
            Stake on a promise. Doubters bet against you. GenLayer validator consensus is the referee.
          </div>
        </div>

        {/* footer rule line */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#8a8f99",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "4px",
          }}
        >
          every doubt recorded · every receipt public
        </div>
      </div>
    ),
    { ...size },
  );
}
