// Client-safe. Same rule as quizTypes and conversationTypes: this file must
// never import ./content, because the quiz and Talk Mode islands both use it.

/**
 * Whether a line addresses somebody formally or informally.
 *
 * Read off the pronoun that is already in the authored line. Nothing here
 * writes, translates or rewrites any target language: it recognises a word the
 * author chose and labels it, which is the one thing that can be done to this
 * content without a source.
 *
 * Two of the three editions have the distinction and one does not, which is
 * why this is per locale rather than one rule:
 *
 * - **German.** `du` is for one person you know; `Sie` is the formal address
 *   for strangers and business, and is always capitalised, as are `Ihnen` and
 *   `Ihr`. See Lingoda, "Du or Sie?", and Study.com, "German Formal &
 *   Informal Pronouns".
 * - **Spanish.** `tú` is informal and `usted` formal; in Spain the informal
 *   plural is `vosotros` and `ustedes` is the formal one. See Berlitz,
 *   "Tú vs. Usted", and Babbel, "A Guide To Using Tú And Usted".
 * - **Swedish.** No tag, ever. The du-reform of the late 1960s made `du`
 *   universal, and `ni` now reads as stiff or condescending rather than
 *   polite; `ni` in this content is the plural "you". Tagging Swedish would
 *   teach a distinction that Swedish does not have. See Wikipedia,
 *   "Du-reformen", and Online Swedish, "The Du vs. Ni Debate".
 */
export type Register = "formal" | "informal";

/**
 * German formal address, matched away from the start of a sentence.
 *
 * `Sie` capitalised is the formal "you", but capitalised `sie` at the start of
 * a sentence is "she" or "they" and looks identical. Rather than guess, a
 * sentence-initial `Sie` is left untagged: a missing tag costs a learner
 * nothing, and a wrong one teaches them to address a stranger as "she".
 *
 * Boundaries throughout this file are Unicode letter lookarounds rather than
 * `\b`. In a non-unicode JavaScript regex `\b` counts only [A-Za-z0-9_] as
 * word characters, so `\btú\b` never matches "¿Y tú?": between `ú` and `?`
 * are two non-word characters and therefore no boundary at all. Every accented
 * pronoun would have failed silently, which is the worst shape of bug here,
 * because an untagged line looks exactly like a line that has no register.
 */
const DE_FORMAL = /(?<!^)(?<![.!?…]\s)(?<!\p{L})(Sie|Ihnen|Ihre[nmrs]?|Ihr)(?!\p{L})/u;
const DE_INFORMAL = /(?<!\p{L})(du|dich|dir|deine[nmrs]?|dein|euch|eure[nmrs]?)(?!\p{L})/u;

/**
 * Spanish. `te`, `os` and `tu` are deliberately absent: `te` and `os` are
 * object and reflexive pronouns that turn up in lines nobody would call
 * informal, and unaccented `tu` is the possessive. The pronouns kept here are
 * the ones that only ever carry address.
 */
const ES_FORMAL = /(?<!\p{L})(usted|ustedes)(?!\p{L})/iu;
const ES_INFORMAL = /(?<!\p{L})(tú|vosotros|vosotras|ti|contigo)(?!\p{L})/iu;

/**
 * The register a line is written in, or null where it does not say.
 *
 * Null is the common case and the right answer for most lines: "Una caña,
 * porfa" addresses nobody in particular, and labelling it would be inventing a
 * distinction the sentence does not make.
 */
export function registerOf(locale: string, line: string): Register | null {
  const text = line?.trim();
  if (!text) return null;

  if (locale.startsWith("de")) {
    // Informal first: a line carrying `du` is informal whatever else is in it,
    // and the formal pattern deliberately cannot see a sentence-initial Sie.
    if (DE_INFORMAL.test(text)) return "informal";
    if (DE_FORMAL.test(text)) return "formal";
    return null;
  }

  if (locale.startsWith("es")) {
    if (ES_FORMAL.test(text)) return "formal";
    if (ES_INFORMAL.test(text)) return "informal";
    return null;
  }

  // Swedish, and anything added later without a rule of its own.
  return null;
}

/** What the tag says on screen. */
export const REGISTER_LABEL: Record<Register, string> = {
  formal: "formal",
  informal: "informal",
};
