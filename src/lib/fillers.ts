// SERVER ONLY, like ./conversations.ts: it reads the content files.

import { getTalkLines, type Locale } from "./content";
import type { ConvLine } from "./conversationTypes";

/** Talk lines that are fillers are the ones named so: `es-filler-pues`. */
export const FILLER_ID = /^(es|de|sv)-filler-/;

/**
 * An edition's filler pool (see lib/fillerTypes.ts), as lines with their clips.
 *
 * Each is a whole line in the content's `talk` list, recorded under its own id
 * like every other talk line, so nothing here is a line of the language.
 */
export function buildFillers(locale: Locale): ConvLine[] {
  return getTalkLines(locale)
    .filter((line) => FILLER_ID.test(line.id))
    .map((line) => ({ source: line.es, en: line.en, audioId: line.id }));
}
