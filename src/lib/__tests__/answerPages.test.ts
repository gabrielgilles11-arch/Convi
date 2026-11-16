import { describe, expect, it } from "vitest";
import { cleanQuery, getAnswerPages, relatedAnswers, slugify } from "../answerPages";
import { getCategoryById, isPremiumCategory, LOCALES } from "../content";
import { DESCRIPTION_MAX, TITLE_MAX } from "../seo";

/**
 * The /answers pages are generated from content that anybody can edit, and a
 * content edit is the one thing that can break them without touching this
 * code. These say which way it broke.
 */
describe("answer pages", () => {
  const pages = getAnswerPages();

  it("exist for every edition", () => {
    for (const l of LOCALES) {
      expect(getAnswerPages(l.locale).length, l.locale).toBeGreaterThan(0);
    }
  });

  it("have one URL each", () => {
    const paths = pages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("fit in a search result", () => {
    for (const p of pages) {
      expect(p.title.length, p.path).toBeLessThanOrEqual(TITLE_MAX);
      expect(p.description.length, p.path).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("have clean slugs", () => {
    for (const p of pages) expect(p.slug, p.path).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("point back at a real, free scenario in their own edition", () => {
    for (const p of pages) {
      expect(getCategoryById(p.category.id, p.locale), p.path).toBeDefined();
      expect(isPremiumCategory(p.category.id), p.path).toBe(false);
    }
  });

  it("carry a note, which is what makes them worth landing on", () => {
    for (const p of pages) expect(p.exchange.notes.trim(), p.path).not.toBe("");
  });

  it("only show target-language lines that are in the content file", () => {
    // The page template prints yourLine, theirLine and alternatives. Each must
    // be the exchange's own line, never something assembled here.
    for (const p of pages) {
      const ex = p.exchange;
      const own = [ex.question.es, ...ex.answers.map((a) => a.es), ex.likelyReply?.es].filter(Boolean);
      expect(own, p.path).toContain(p.yourLine.es);
      if (p.theirLine) expect(own, p.path).toContain(p.theirLine.es);
      for (const alt of p.alternatives) expect(own, p.path).toContain(alt.es);
    }
  });

  it("have no em dashes in the English of their meta descriptions", () => {
    // The quoted target-language lines are left exactly as the content has
    // them, dashes included; only the copy around them is held to house style.
    for (const p of pages) {
      const english = p.description.replace(/"[^"]*"/g, "");
      expect(english, p.path).not.toContain("—");
    }
  });

  it("link to other answers from the same scenario, never to themselves", () => {
    for (const p of pages) {
      for (const r of relatedAnswers(p)) {
        expect(r.slug).not.toBe(p.slug);
        expect(r.category.id).toBe(p.category.id);
      }
    }
  });
});

describe("cleanQuery", () => {
  it("keeps the first of two alternatives", () => {
    expect(cleanQuery("Excuse me! / Hey!")).toBe("Excuse me");
  });

  it("drops a register aside", () => {
    expect(cleanQuery("Do you speak English? (informal du)")).toBe("Do you speak English?");
  });
});

describe("slugify", () => {
  it("folds accents and apostrophes", () => {
    expect(slugify("Where's the café?")).toBe("wheres-the-cafe");
  });
});
