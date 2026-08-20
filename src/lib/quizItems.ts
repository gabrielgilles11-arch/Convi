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
          const base = {
            categoryId: category.id,
            categoryTitle: category.title,
            front: exchange.question.es,
            frontTranslation: exchange.question.en,
            frontAudioId: `${exchange.id}-q`,
          };

          // The next line of the exchange. This used to be dropped on the floor
          // whenever an exchange also had a likelyReply, which threw away most
          // of the deck's production material.
          //
          // The prompt deliberately does not say whose line it is. The schema
          // calls `answers` your model answers, and in beer-food they are — the
          // bartender asks "¿Qué vas a tomar?" and you answer. But in
          // getting-around the question is yours ("¿Aceptas tarjeta?") and the
          // answers belong to the driver ("Sí." / "Solo efectivo."). Nothing in
          // the content marks who speaks, so any prompt naming a speaker would
          // be wrong for roughly half the deck. "What comes next?" is true
          // either way. Give an exchange a speaker field and this can sharpen.
          const next = exchange.answers[0];
          if (next?.es) {
            items.push({
              ...base,
              id: `${exchange.id}-say`,
              kind: "dialogue",
              role: "say",
              prompt: "What comes next?",
              correctAnswer: next.es,
              correctAnswerTranslation: next.en,
              answerAudioId: `${exchange.id}-a0`,
            });
          }

          // What they come back with. Kept on the bare exchange id so an
          // already-recorded mistake on one of these survives this change.
          if (exchange.likelyReply?.es) {
            items.push({
              ...base,
              id: exchange.id,
              kind: "dialogue",
              role: "reply",
              prompt: "What would they probably say back?",
              correctAnswer: exchange.likelyReply.es,
              correctAnswerTranslation: exchange.likelyReply.en,
              answerAudioId: `${exchange.id}-r`,
            });
          }

          // Whose line the question is depends on whether the exchange offers
          // answers. With answers, someone asks you something and `yours` above
          // is your reply. Without them, the question is the thing *you* say —
          // "¡Me han robado la cartera!" is not a prompt you respond to, it's
          // the sentence you need — so it becomes production material in its
          // own right. The whole Emergencies category is built this way, and
          // without this it contributed nothing but comebacks.
          if (!next?.es && exchange.question.en) {
            items.push({
              ...base,
              id: `${exchange.id}-ask`,
              kind: "phrase",
              role: "say",
              prompt: "What does this mean?",
              frontTranslation: null,
              correctAnswer: exchange.question.en,
              correctAnswerTranslation: null,
              answerAudioId: `${exchange.id}-q`,
            });
          }
        }
      }

      if (dialogue.items) {
        dialogue.items.forEach((tip, i) => {
          // Id matches what scripts/generate-audio.mjs writes. It used to be
          // keyed on the Spanish text, which no audio file was ever named
          // after, so tip audio could never resolve.
          const id = `${sub.id}-tip${i}`;
          items.push({
            id,
            categoryId: category.id,
            categoryTitle: category.title,
            kind: "phrase",
            role: "phrase",
            prompt: "What does this mean?",
            front: tip.es,
            frontTranslation: null,
            correctAnswer: tip.en,
            correctAnswerTranslation: null,
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
            role: "phrase",
            prompt: "What does this mean?",
            front: phrase.es,
            frontTranslation: null,
            correctAnswer: phrase.en,
            correctAnswerTranslation: null,
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
