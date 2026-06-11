import { describe, expect, it } from "vitest";
import {
  deadlinePressure,
  oddsLine,
  rejectionBanner,
  shareCaption,
  streakNudge,
} from "@/lib/psychology/copy";

const base = { believerPool: 0, doubterPool: 0, selfStake: 100 };

describe("oddsLine — pool-ratio bands", () => {
  it("handles an empty table", () => {
    expect(oddsLine({ believerPool: 0, doubterPool: 0, selfStake: 0 })).toMatch(/No money/);
  });
  it("calls out zero doubt", () => {
    expect(oddsLine(base)).toMatch(/Nobody dares/);
  });
  it("escalates with the doubt ratio", () => {
    expect(oddsLine({ ...base, doubterPool: 400 })).toMatch(/fantasy/);
    expect(oddsLine({ ...base, doubterPool: 180 })).toMatch(/collapse/);
    expect(oddsLine({ ...base, doubterPool: 90 })).toMatch(/Dead heat/);
    expect(oddsLine({ ...base, doubterPool: 40 })).toMatch(/believers are winning/);
    expect(oddsLine({ ...base, doubterPool: 10 })).toMatch(/Cowards/);
  });
  it("formats amounts with thousands separators", () => {
    expect(oddsLine({ ...base, doubterPool: 1500 })).toContain("1,500");
  });
});

describe("streakNudge", () => {
  const stakes = [
    { address: "0xSrab0ni0000000000000000000000000000001", side: "doubt" as const, amount: 150, at: 0 },
    { address: "0xSmall", side: "doubt" as const, amount: 10, at: 0 },
  ];
  it("names the biggest doubter once the streak builds", () => {
    const line = streakNudge({ verifiedCount: 12, stakes });
    expect(line).toContain("Day 12");
    expect(line).toContain("150");
    expect(line).toMatch(/nervous/);
  });
  it("handles day zero and no doubters", () => {
    expect(streakNudge({ verifiedCount: 0, stakes: [] })).toMatch(/Day zero/);
    expect(streakNudge({ verifiedCount: 3, stakes: [] })).toMatch(/Quiet doubters/);
  });
});

describe("deadlinePressure tiers", () => {
  it("escalates as time runs out", () => {
    expect(deadlinePressure(-1)).toMatch(/Time's up/);
    expect(deadlinePressure(2 * 3_600_000)).toMatch(/Hours left/);
    expect(deadlinePressure(20 * 3_600_000)).toMatch(/Final day/);
    expect(deadlinePressure(60 * 3_600_000)).toMatch(/Three days/);
    expect(deadlinePressure(10 * 24 * 3_600_000)).toMatch(/10 days left/);
  });
});

describe("copy safety", () => {
  const c = { statement: "I will run 5km every day", doubterPool: 980 };
  it("share captions exist for every event and stay clean", () => {
    const events = ["created", "doubted", "verified", "rejected", "won", "calledIt"] as const;
    for (const e of events) {
      const caption = shareCaption(e, c);
      expect(caption.length).toBeGreaterThan(10);
      expect(caption).not.toMatch(/\b(fat|ugly|stupid|idiot|loser)\b/i);
    }
  });
  it("rejection banner names the creator, not insults", () => {
    expect(rejectionBanner("0xabc…def")).toContain("0xabc…def");
  });
});
