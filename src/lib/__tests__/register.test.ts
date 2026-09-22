import { describe, expect, it } from "vitest";
import { registerOf } from "../register";
import { getCategories, LOCALES, type DialogueSubsection } from "../content";

/**
 * Register tags are read off the pronoun the author already wrote. The risk is
 * not missing one; it is claiming one that is not there, because a line
 * labelled "formal" teaches somebody to address a stranger that way.
 */
describe("reading register off a line", () => {
  it("tags German by its address pronoun", () => {
    expect(registerOf("de-DE", "Haben Sie reserviert?")).toBe("formal");
    expect(registerOf("de-DE", "Kann ich bitte Ihren Pass sehen?")).toBe("formal");
    expect(registerOf("de-DE", "Sprichst du Englisch?")).toBe("informal");
    expect(registerOf("de-DE", "Wie geht's dir?")).toBe("informal");
  });

  it("will not read a sentence-initial Sie as the formal you", () => {
    // "Sie haben noch eins" is "they have one left" as readily as a formal
    // "you have one left", and the two are spelled identically. Untagged is
    // the honest answer.
    expect(registerOf("de-DE", "Sie haben noch eins.")).toBeNull();
    expect(registerOf("de-DE", "Kein Problem. Sie sind schon weg.")).toBeNull();
  });

  it("tags Spanish by its address pronoun, in Spain's plural too", () => {
    expect(registerOf("es-ES", "¿Cómo está usted?")).toBe("formal");
    expect(registerOf("es-ES", "¿Y tú?")).toBe("informal");
    expect(registerOf("es-ES", "¿Queréis vosotros la cuenta?")).toBe("informal");
  });

  it("leaves Spanish object pronouns alone", () => {
    // "te" and "os" are everywhere and address nobody in particular; tagging
    // on them would put a label on most of the edition.
    expect(registerOf("es-ES", "¿Te pongo otra?")).toBeNull();
    expect(registerOf("es-ES", "Una caña, porfa.")).toBeNull();
  });

  it("never tags Swedish", () => {
    // The du-reform made du universal; ni here is the plural you.
    expect(registerOf("sv-SE", "Vad heter du?")).toBeNull();
    expect(registerOf("sv-SE", "Vill ni beställa?")).toBeNull();
  });

  it("says nothing about a line that addresses nobody", () => {
    expect(registerOf("de-DE", "Ein Bier, bitte.")).toBeNull();
    expect(registerOf("es-ES", "Perfecto.")).toBeNull();
  });
});

/**
 * Applied to the real editions, the tag has to stay rare. If it fires on most
 * lines it has stopped meaning anything, and it is far more likely that the
 * pattern is too loose than that the content is uniformly formal.
 */
describe("register across the editions", () => {
  for (const { locale } of LOCALES) {
    it(`${locale}: tags a minority of lines, and none in Swedish`, () => {
      let total = 0;
      let tagged = 0;
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          for (const ex of (sub as DialogueSubsection).exchanges ?? []) {
            for (const line of [ex.question?.es, ...ex.answers.map((a) => a.es), ex.likelyReply?.es]) {
              if (!line) continue;
              total += 1;
              if (registerOf(locale, line)) tagged += 1;
            }
          }
        }
      }
      expect(total).toBeGreaterThan(0);
      if (locale === "sv-SE") expect(tagged).toBe(0);
      else expect(tagged / total).toBeLessThan(0.5);
    });
  }
});
