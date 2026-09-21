import { describe, expect, it } from "vitest";
import { getHeroDemo, HERO_DEMO_LOCALE } from "../heroDemo";
import {
  getCategories,
  isDialogueSubsection,
  roughLineCount,
  type DialogueSubsection,
} from "../content";

/**
 * The home page hero plays a conversation out of `content/es-ES.json`.
 *
 * It is the first thing every visitor sees and it is built from content that
 * somebody else is free to edit. `getHeroDemo` throws rather than degrading
 * when a beat it names goes missing, which means an edit to the Spanish file
 * can stop the build; these are here so it stops at `npm test` instead, with a
 * message that says which beat and why.
 */
describe("the hero conversation", () => {
  const demo = getHeroDemo();

  it("plays two beats of Spanish", () => {
    expect(demo.locale).toBe("es-ES");
    expect(demo.language).toBe("Spanish");
    expect(demo.beats).toHaveLength(2);
  });

  it("is a conversation, not a phrase list", () => {
    // The claim the card makes is "they open, you answer, they answer back".
    // A beat missing any of the three would still render; it would just be
    // quietly making a smaller claim than the copy beside it.
    for (const beat of demo.beats) {
      expect(beat.situation, `${beat.id} situation`).toBeTruthy();
      expect(beat.them.source, `${beat.id} their line`).toBeTruthy();
      expect(beat.you.source, `${beat.id} your line`).toBeTruthy();
      expect(beat.reply.source, `${beat.id} their reply`).toBeTruthy();
    }
  });

  it("carries the English for every line", () => {
    // Somebody who reads no Spanish is exactly who this card is aimed at.
    for (const beat of demo.beats) {
      for (const [side, line] of [
        ["them", beat.them],
        ["you", beat.you],
        ["reply", beat.reply],
      ] as const) {
        expect(line.en, `${beat.id} ${side} gloss`).toBeTruthy();
      }
    }
  });

  it("splits the aside out of the gloss rather than printing the dash", () => {
    // "A small draft beer, please — how locals order" is one field in the
    // content and two things on the card. Em dashes were taken out of the
    // user-facing copy across the site; this is the one place a content field
    // could put one back.
    for (const beat of demo.beats) {
      for (const line of [beat.them, beat.you, beat.reply]) {
        expect(line.en).not.toContain("—");
      }
    }
  });

  it("shows the line the content actually authored, word for word", () => {
    // The point of building this from the content files is that no Spanish is
    // retyped into a template. If it ever is, this catches the copy drifting
    // from the edition it claims to be quoting.
    const authored = new Map<string, { question: string; answers: string[]; reply: string | null }>();
    for (const category of getCategories(HERO_DEMO_LOCALE)) {
      for (const sub of category.subsections) {
        if (!isDialogueSubsection(sub)) continue;
        for (const ex of (sub as DialogueSubsection).exchanges ?? []) {
          authored.set(ex.id, {
            question: ex.question.es,
            answers: ex.answers.map((a) => a.es),
            reply: ex.likelyReply?.es ?? null,
          });
        }
      }
    }

    for (const beat of demo.beats) {
      const source = authored.get(beat.id);
      expect(source, `${beat.id} is not in the Spanish content`).toBeDefined();
      expect(beat.them.source).toBe(source!.question);
      expect(source!.answers).toContain(beat.you.source);
      expect(beat.reply.source).toBe(source!.reply);
    }
  });

  it("points at the Spanish practice path", () => {
    // Spanish is the edition that lives at the root, so no slug.
    expect(demo.href).toBe("/practice");
  });
});

/**
 * Counts read out loud.
 *
 * The exact figure belongs in the section index on /about, where it is a
 * directory. In a sentence on a landing page it is a claim, and a claim that
 * names 943 invites the reader to audit it and goes stale on the next content
 * edit.
 */
describe("saying a line count in prose", () => {
  it("rounds down to the nearest 500", () => {
    expect(roughLineCount(943)).toBe("over 500");
    expect(roughLineCount(500)).toBe("over 500");
    expect(roughLineCount(1400)).toBe("over 1,000");
    expect(roughLineCount(2000)).toBe("over 2,000");
  });

  it("never rounds up, so the claim is never larger than the content", () => {
    for (const n of [499, 500, 501, 942, 943, 999, 1000, 1001, 4321]) {
      const stated = Number(roughLineCount(n).replace(/[^0-9]/g, ""));
      expect(stated, `${n} stated as ${stated}`).toBeLessThanOrEqual(n);
    }
  });

  it("gives the exact number when there is nothing to round to", () => {
    // No edition is this small, but a claim of "over 0 lines" would be worse
    // than the truth if one ever were.
    expect(roughLineCount(12)).toBe("12");
    expect(roughLineCount(0)).toBe("0");
  });
});
