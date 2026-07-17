import { getCategories, type Category, type DialogueSubsection, type PhrasebookSubsection } from "./content";

export interface QuizItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  kind: "dialogue" | "phrase";
  prompt: string; // instruction shown in test mode, e.g. "What would they probably say back?"
  front: string; // Spanish shown on the flashcard front
  frontTranslation: string | null;
  correctAnswer: string; // Spanish (dialogue) or English translation (phrase) — the thing being tested
  correctAnswerTranslation: string | null;
}

function buildItems(): QuizItem[] {
  const items: QuizItem[] = [];

  for (const category of getCategories()) {
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

export const quizItems: QuizItem[] = buildItems();

export function getCategoryList(): { id: string; title: string }[] {
  const seen = new Map<string, string>();
  for (const c of getCategories() as Category[]) seen.set(c.id, c.title);
  return [...seen.entries()].map(([id, title]) => ({ id, title }));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds 4 multiple-choice options (1 correct + 3 distractors) for an item.
 * Distractors are pulled from sibling items of the same kind, since each
 * item's quizQuestions array is empty for v1 (no authored distractors yet).
 */
export function buildOptions(item: QuizItem, pool: QuizItem[]): string[] {
  const candidates = pool
    .filter((i) => i.kind === item.kind && i.correctAnswer !== item.correctAnswer)
    .map((i) => i.correctAnswer);

  const uniqueCandidates = [...new Set(candidates)];
  const distractors = shuffle(uniqueCandidates).slice(0, 3);

  return shuffle([item.correctAnswer, ...distractors]);
}
