/**
 * Where a local can drop a filler into a Talk conversation, and how often.
 *
 * A filler ("Sí, sí.", "Pero bueno…", "Egal.") is always its own line, said
 * as written in the content: never stitched onto another line, because a line
 * nobody published is a line nobody can check. So it can only go where it
 * reads as something the local would say on its own at that beat, and those
 * beats are chosen by hand, per step, in ./talkFillers/<locale>.ts.
 *
 * At run time most conversations get none (see `planFillers`).
 */
export type FillerWhen =
  /** After your line, before their reply: "Sí, sí." then "Pues el pulpo está muy bueno." */
  | "before-reply"
  /** After their reply, trailing it: their reply, then "…y tal." */
  | "after-reply";

export interface FillerSlot {
  /** The id of a phrase in the edition's content (a word-list entry). */
  phrase: string;
  when: FillerWhen;
  /**
   * Which of your lines on this step it fits after, by index into the step's
   * `says`. Omitted: any of them. A filler that only makes sense after one
   * particular answer ("Pero bueno…" after a complaint) names it.
   */
  on?: number[];
}

/** Script id → step id → the fillers that fit at that beat. */
export type TalkFillerSlots = Record<string, Record<string, FillerSlot[]>>;

import { ES_FILLERS } from "./talkFillers/es-ES";
import { SV_FILLERS } from "./talkFillers/sv-SE";
import { DE_FILLERS } from "./talkFillers/de-DE";

/** Every edition's filler slots, keyed by locale. */
export const TALK_FILLERS: Record<string, TalkFillerSlots> = {
  "es-ES": ES_FILLERS,
  "sv-SE": SV_FILLERS,
  "de-DE": DE_FILLERS,
};
