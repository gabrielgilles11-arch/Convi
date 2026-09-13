import { describe, it, expect } from "vitest";
import { scoreItem, isQualified } from "../rubric.mjs";

const NOW = new Date("2026-09-13T08:00:00Z");

function item({ title, summary = "", publishedAt = NOW }) {
  return { title, summary, publishedAt };
}

describe("scoreItem", () => {
  it("scores a squarely on-beat headline highly on both axes", () => {
    const scored = scoreItem(
      item({
        title: "China restricts gallium and germanium exports amid trade tension with EU",
        summary: "The 25% export curb follows months of transatlantic friction over critical minerals.",
      }),
      3,
      NOW,
    );
    expect(scored.mineral).toBeGreaterThanOrEqual(3);
    expect(scored.friction).toBeGreaterThanOrEqual(1);
    expect(scored.magnitude).toBe(2);
    expect(scored.recency).toBe(2);
    expect(isQualified(scored)).toBe(true);
  });

  it("scores an unrelated headline at zero on both content axes", () => {
    const scored = scoreItem(item({ title: "City council approves new bike lane budget" }), 2, NOW);
    expect(scored.mineral).toBe(0);
    expect(scored.friction).toBe(0);
    expect(isQualified(scored)).toBe(false);
  });

  it("caps keyword score instead of letting a keyword-stuffed item run away with it", () => {
    const stuffed = item({
      title: "lithium cobalt nickel graphite gallium germanium antimony tungsten",
    });
    const scored = scoreItem(stuffed, 3, NOW);
    expect(scored.mineral).toBe(4);
  });

  it("decays recency for items older than three days", () => {
    const old = item({ title: "critical mineral supply chain report", publishedAt: new Date("2026-08-01T00:00:00Z") });
    const scored = scoreItem(old, 3, NOW);
    expect(scored.recency).toBe(0);
  });

  it("qualifies a moderate item only when both axes contribute, not on authority alone", () => {
    const bothModerate = item({ title: "Cobalt shipments face new tariff after EU review" });
    const scored = scoreItem(bothModerate, 3, NOW);
    expect(isQualified(scored)).toBe(true);
  });
});
