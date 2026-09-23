// SERVER ONLY. This module imports the content file, so anything that imports
// it gets the full content JSON. It must only ever be pulled in from an API
// route or an .astro frontmatter block — never from a React island, or the
// content ends up in the browser bundle and Practice stops being paywalled.
//
// Client components import types and buildOptions from ./quizTypes instead,
// and get their data from GET /api/quiz-items.

import {
  getCategories,
  DEFAULT_LOCALE,
  type Category,
  type DialogueSubsection,
  type Exchange,
  type Locale,
  type PhrasebookSubsection,
} from "./content";
import type { QuizCategory, QuizItem } from "./quizTypes";

/**
 * One authored exchange as the deck sees it, or null where it has no line for
 * the learner to produce.
 *
 * `speaker` decides which line that is, and which one comes back at them
 * afterwards. When they ask, your line is among `answers` and their comeback is
 * `likelyReply`; when you ask, the question is yours and everything else is
 * theirs.
 */
function situationFrom(
  exchange: Exchange,
  category: Category,
  subsectionId: string
): QuizItem | null {
  const theirTurn = exchange.speaker === "them";
  const mine = theirTurn ? exchange.answers[0] : exchange.question;
  const theirs = theirTurn
    ? exchange.likelyReply
    : (exchange.answers[0] ?? exchange.likelyReply);
  // The clip for whichever line `theirs` turned out to be.
  const theirsAudio = theirTurn || !exchange.answers[0] ? `${exchange.id}-r` : `${exchange.id}-a0`;

  if (!mine?.es || !exchange.situation?.en) return null;

  return {
    id: exchange.id,
    categoryId: category.id,
    categoryTitle: category.title,
    subsectionId,
    kind: "situation",
    // The prompt is the situation, in English. It is the whole question:
    // nothing in the target language is shown until you've answered.
    prompt: "What do you say?",
    front: exchange.situation.en,
    frontTranslation: null,
    correctAnswer: mine.es,
    correctAnswerTranslation: mine.en,
    // Only where they opened: those are the lines written as answers to this
    // scene. When you open, `answers` is what comes back at you, and marking
    // their reply correct would be accepting the wrong half of the exchange.
    alsoAccepted: theirTurn
      ? exchange.answers
          .slice(1)
          .map((a) => a.es)
          .filter((es): es is string => Boolean(es?.trim()))
      : [],
    // Shown after the answer settles, never before — it is the payoff,
    // not part of the question.
    reply: theirs?.es ? { source: theirs.es, en: theirs.en } : null,
    replyAudioId: theirs?.es ? theirsAudio : null,
    frontAudioId: null,
    answerAudioId: theirTurn ? `${exchange.id}-a0` : `${exchange.id}-q`,
  };
}

export function buildQuizItems(locale: Locale = DEFAULT_LOCALE): QuizItem[] {
  const items: QuizItem[] = [];

  for (const category of getCategories(locale)) {
    for (const sub of category.subsections) {
      const dialogue = sub as DialogueSubsection;
      // `exchanges` are authored for the scenario page and practice both;
      // `scenes` exist only here, to put a word list's words in a moment. They
      // build identically — the difference is only which surfaces read them.
      for (const exchange of [...(dialogue.exchanges ?? []), ...(sub.scenes ?? [])]) {
        const item = situationFrom(exchange, category, sub.id);
        if (item) items.push(item);
      }

      if (dialogue.items) {
        dialogue.items.forEach((tip, i) => {
          // Id matches what scripts/generate-audio.mjs writes. It used to be
          // keyed on the source text, which no audio file was ever named after.
          const id = `${sub.id}-tip${i}`;
          items.push({
            id,
            categoryId: category.id,
            categoryTitle: category.title,
            subsectionId: sub.id,
            kind: "phrase",
            prompt: "What does this mean?",
            front: tip.es,
            frontTranslation: null,
            correctAnswer: tip.en,
            correctAnswerTranslation: null,
            alsoAccepted: [],
            reply: null,
            frontAudioId: id,
            answerAudioId: id,
          });
        });
      }

      const phrasebook = sub as PhrasebookSubsection;
      if (phrasebook.phrases) {
        for (const phrase of phrasebook.phrases) {
          // A word a scene already teaches stays on the scenario page and out
          // of here, so the deck asks for its definition no more than three
          // times per subsection.
          if (phrase.practice === false) continue;
          items.push({
            id: phrase.id,
            categoryId: category.id,
            categoryTitle: category.title,
            subsectionId: sub.id,
            kind: "phrase",
            prompt: "What does this mean?",
            front: phrase.es,
            frontTranslation: null,
            correctAnswer: phrase.en,
            correctAnswerTranslation: null,
            alsoAccepted: [],
            reply: null,
            frontAudioId: phrase.id,
            answerAudioId: phrase.id,
          });
        }
      }
    }
  }

  return items;
}

export function getCategoryList(locale: Locale = DEFAULT_LOCALE): QuizCategory[] {
  const seen = new Map<string, string>();
  for (const c of getCategories(locale) as Category[]) seen.set(c.id, c.title);
  return [...seen.entries()].map(([id, title]) => ({ id, title }));
}
