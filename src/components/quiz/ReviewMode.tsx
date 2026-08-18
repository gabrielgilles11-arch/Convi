import { useMemo, useState } from "react";
import type { QuizItem } from "../../lib/quizTypes";
import { markItemReviewed, markItemKnown, markItemUnknown } from "../../lib/progress";

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
  const [knownCount, setKnownCount] = useState(0);
  const [missed, setMissed] = useState<QuizItem[]>([]);
  const [done, setDone] = useState(false);

  function startDeck(deck: QuizItem[]) {
    setOrder(shuffle(deck));
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setMissed([]);
    setDone(false);
  }

  // Reset the deck whenever the filtered item set changes (e.g. category switch)
  const itemsKey = useMemo(() => items.map((i) => i.id).join(","), [items]);
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    startDeck(items);
  }

  if (order.length === 0) {
    return <p>No cards in this category yet.</p>;
  }

  function flip() {
    setFlipped((f) => !f);
    if (!flipped) markItemReviewed(order[index].id);
  }

  function advance() {
    if (index + 1 >= order.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  function mark(known: boolean) {
    const card = order[index];
    if (known) {
      markItemKnown(card.id);
      setKnownCount((c) => c + 1);
    } else {
      markItemUnknown(card.id);
      setMissed((m) => [...m, card]);
    }
    advance();
  }

  if (done) {
    return (
      <div className="review-done">
        <p className="review-done-score">
          {knownCount} / {order.length} got it
        </p>
        {missed.length > 0 ? (
          <>
            <p className="review-done-sub">
              You marked {missed.length} card{missed.length === 1 ? "" : "s"} as still learning.
            </p>
            <div className="controls">
              <button type="button" className="review-primary" onClick={() => startDeck(missed)}>
                Review the {missed.length} you missed
              </button>
              <button type="button" onClick={() => startDeck(items)}>
                Restart deck
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="review-done-sub">Nice — you knew every card in this deck.</p>
            <div className="controls">
              <button type="button" className="review-primary" onClick={() => startDeck(items)}>
                Restart deck
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const card = order[index];

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

      {flipped ? (
        <div className="controls">
          <button type="button" className="mark-unknown" onClick={() => mark(false)}>
            Still learning
          </button>
          <button type="button" className="mark-known" onClick={() => mark(true)}>
            Got it
          </button>
        </div>
      ) : (
        <div className="controls">
          <button type="button" onClick={flip}>
            Show answer
          </button>
        </div>
      )}
    </div>
  );
}
