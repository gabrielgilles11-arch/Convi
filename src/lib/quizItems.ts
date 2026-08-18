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
          if (exchange.likelyReply) {
            items.push({
              id: exchange.id,
              categoryId: category.id,
              categoryTitle: category.title,
              kind: "dialogue",
              prompt: "What would they probably say back?",
              front: exchange.question.es,
              frontTranslation: exchange.question.en,
              correctAnswer: exchange.likelyReply.es,
              correctAnswerTranslation: exchange.likelyReply.en,
            });
            continue;
          }
          // No likelyReply (e.g. women's-safety lines). If the exchange
          // suggests responses, test the first one as the comeback;
          // otherwise treat the line itself as a phrase to translate.
          if (exchange.answers.length > 0) {
            const reply = exchange.answers[0];
            items.push({
              id: exchange.id,
              categoryId: category.id,
              categoryTitle: category.title,
              kind: "dialogue",
              prompt: "How would you shut this down?",
              front: exchange.question.es,
              frontTranslation: exchange.question.en,
              correctAnswer: reply.es,
              correctAnswerTranslation: reply.en,
            });
          } else if (exchange.question.en) {
            items.push({
              id: exchange.id,
              categoryId: category.id,
              categoryTitle: category.title,
              kind: "phrase",
              prompt: "What does this mean?",
              front: exchange.question.es,
              frontTranslation: null,
              correctAnswer: exchange.question.en,
              correctAnswerTranslation: null,
            });
          }
        }
      }

      if (dialogue.items) {
        for (const tip of dialogue.items) {
          items.push({
            id: `${sub.id}-${tip.es}`,
            categoryId: category.id,
            categoryTitle: category.title,
            kind: "phrase",
            prompt: "What does this mean?",
            front: tip.es,
            frontTranslation: null,
            correctAnswer: tip.en,
            correctAnswerTranslation: null,
          });
        }
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
