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
  type Locale,
  type PhrasebookSubsection,
} from "./content";
import type { QuizCategory, QuizItem } from "./quizTypes";

export function buildQuizItems(locale: Locale = DEFAULT_LOCALE): QuizItem[] {
  const items: QuizItem[] = [];

  for (const category of getCategories(locale)) {
    for (const sub of category.subsections) {
      const dialogue = sub as DialogueSubsection;
      if (dialogue.exchanges) {
        for (const exchange of dialogue.exchanges) {
          // `speaker` decides which line the learner produces, and which one
          // comes back at them afterwards. When they ask, your line is among
          // `answers` and their comeback is `likelyReply`; when you ask, the
          // question is yours and everything else is theirs.
          const theirTurn = exchange.speaker === "them";
          const mine = theirTurn ? exchange.answers[0] : exchange.question;
          const theirs = theirTurn
            ? exchange.likelyReply
            : (exchange.answers[0] ?? exchange.likelyReply);

          if (!mine?.es || !exchange.situation?.en) continue;

          items.push({
            id: exchange.id,
            categoryId: category.id,
            categoryTitle: category.title,
            kind: "situation",
            // The prompt is the situation, in English. It is the whole question:
            // nothing in the target language is shown until you've answered.
            prompt: "What do you say?",
            front: exchange.situation.en,
            frontTranslation: null,
            correctAnswer: mine.es,
            correctAnswerTranslation: mine.en,
            // Shown after the answer settles, never before — it is the payoff,
            // not part of the question.
            reply: theirs?.es ? { source: theirs.es, en: theirs.en } : null,
            frontAudioId: null,
            answerAudioId: theirTurn ? `${exchange.id}-a0` : `${exchange.id}-q`,
          });
        }
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
            kind: "phrase",
            prompt: "What does this mean?",
            front: tip.es,
            frontTranslation: null,
            correctAnswer: tip.en,
            correctAnswerTranslation: null,
            reply: null,
            frontAudioId: id,
            answerAudioId: id,
          });
        });
      }

      const phrasebook = sub as PhrasebookSubsection;
      if (phrasebook.phrases) {
        for (const phrase of phrasebook.phrases) {
          items.push({
            id: phrase.id,
            categoryId: category.id,
            categoryTitle: category.title,
            kind: "phrase",
            prompt: "What does this mean?",
            front: phrase.es,
            frontTranslation: null,
            correctAnswer: phrase.en,
            correctAnswerTranslation: null,
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
