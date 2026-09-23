import { describe, expect, it } from "vitest";
import { spokenLines } from "../../../scripts/generate-audio.mjs";
import { buildConversations } from "../conversations";
import { buildQuizItems } from "../quizItems";
import { LOCALES, type Locale } from "../content";

const locales = LOCALES.map((l) => l.locale);

/**
 * Every line the site can say out loud is a line the recorder records, under
 * the id the site asks for, saying the words on the screen.
 *
 * Two ways that has gone wrong before, both silent. A line with no clip id, or
 * an id the recorder never writes, falls back to the device's own voice, so
 * one line in a conversation comes out in a different voice from the rest:
 * Talk Mode's trimmed comebacks did that. And an id that exists but belongs to
 * another line plays the wrong words under the text: practice rounds asked for
 * `-r` for every reply, when half of them are `-a0`.
 */
describe.each(locales)("audio ids line up with the recorder: %s", (locale: Locale) => {
  const recorded = new Map<string, string>(
    (spokenLines(locale) as { id: string; text: string }[]).map((line) => [line.id, line.text])
  );

  function expectClip(audioId: string | null | undefined, text: string) {
    expect(audioId, `no clip id for "${text}"`).toBeTruthy();
    expect(recorded.get(audioId!), `clip ${audioId}`).toBe(text.trim());
  }

  it("records every line of every Talk Mode conversation", () => {
    for (const convo of buildConversations(locale)) {
      for (const turn of convo.turns) {
        const lines = [turn.theirOpener, ...turn.yourLines, turn.theirReply];
        for (const line of lines) if (line) expectClip(line.audioId, line.source);
      }
    }
  });

  it("records every line a practice round speaks, under the right id", () => {
    for (const item of buildQuizItems(locale)) {
      if (item.kind === "situation") {
        expectClip(item.answerAudioId, item.correctAnswer);
        if (item.reply) expectClip(item.replyAudioId, item.reply.source);
      } else {
        expectClip(item.frontAudioId, item.front);
      }
    }
  });
});
