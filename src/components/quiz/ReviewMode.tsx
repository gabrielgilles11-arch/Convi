import { useMemo, useState } from "react";
import type { QuizItem } from "../../lib/quizItems";
import { markItemReviewed } from "../../lib/progress";

interface Props {
  items: QuizItem[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReviewMode({ items }: Props) {
  const [order, setOrder] = useState<QuizItem[]>(() => shuffle(items));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Reset the deck whenever the filtered item set changes (e.g. category switch)
  const itemsKey = useMemo(() => items.map((i) => i.id).join(","), [items]);
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    setOrder(shuffle(items));
    setIndex(0);
    setFlipped(false);
  }

  if (order.length === 0) {
    return <p>No cards in this category yet.</p>;
  }

  const card = order[index];

  function flip() {
    setFlipped((f) => !f);
    if (!flipped) markItemReviewed(card.id);
  }

  function next() {
    setFlipped(false);
    setIndex((i) => (i + 1) % order.length);
  }

  function prev() {
    setFlipped(false);
    setIndex((i) => (i - 1 + order.length) % order.length);
  }

  function reshuffle() {
    setOrder(shuffle(items));
    setIndex(0);
    setFlipped(false);
  }

  return (
    <div className="review-mode">
      <p className="progress-label">
        Card {index + 1} of {order.length} · {card.categoryTitle}
      </p>

      <button className="flashcard" onClick={flip} type="button">
        {!flipped ? (
          <div className="face front">
            <span className="es">{card.front}</span>
            {card.frontTranslation && <span className="en">{card.frontTranslation}</span>}
            <span className="hint">Tap to flip</span>
          </div>
        ) : (
          <div className="face back">
            <span className="label">{card.kind === "dialogue" ? "They'll say" : "Meaning"}</span>
            <span className="es">{card.correctAnswer}</span>
            {card.correctAnswerTranslation && <span className="en">{card.correctAnswerTranslation}</span>}
          </div>
        )}
      </button>

      <div className="controls">
        <button type="button" onClick={prev}>
          &larr; Prev
        </button>
        <button type="button" onClick={reshuffle}>
          Shuffle
        </button>
        <button type="button" onClick={next}>
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
