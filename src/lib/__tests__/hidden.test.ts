import { describe, expect, it } from "vitest";
import { getCategories, getCategoryById, LOCALES } from "../content";
import { buildQuizItems } from "../quizItems";
import { buildConversations } from "../conversations";

/** "For the girls" is parked (see HIDDEN_CATEGORY_IDS in lib/content.ts). */
describe.each(LOCALES.map((l) => l.locale))("For the girls stays off the site: %s", (locale) => {
  it("is not a section anywhere", () => {
    expect(getCategories(locale).some((c) => c.id.endsWith("for-the-girls"))).toBe(false);
    const id = locale === "es-ES" ? "for-the-girls" : `${locale.slice(0, 2)}-for-the-girls`;
    expect(getCategoryById(id)).toBeUndefined();
  });

  it("is not in practice or Talk", () => {
    expect(buildQuizItems(locale).some((i) => i.categoryId.endsWith("for-the-girls"))).toBe(false);
    expect(buildConversations(locale).some((c) => c.categoryId.endsWith("for-the-girls"))).toBe(false);
  });
});
