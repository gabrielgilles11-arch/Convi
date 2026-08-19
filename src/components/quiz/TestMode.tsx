import { useMemo, useState } from "react";
import {
  buildOptions,
  buildRound,
  ROUND_LENGTH,
  STAGE_CLEAR_SCORE,
  type QuizItem,
} from "../../lib/quizTypes";
import {
  recordAnswer,
  recordRoundComplete,
  currentDayStreak,
  roundsCompletedToday,
  DAILY_GOAL,
} from "../../lib/progress";

interface Props {
  /** Items inside the current category filter. */
  items: QuizItem[];
  /** The whole deck, used only to backfill distractors in small categories. */
  allItems: QuizItem[];
  categoryFilter: string; // "all" or a category id
  /** Next uncleared stage on the path, if there is one. */
  nextStageId: string | null;
  nextStageTitle: string | null;
  onChooseCategory: (id: string) => void;
}

export default function TestMode({
  items,
  allItems,
  categoryFilter,
  nextStageId,
  nextStageTitle,
  onChooseCategory,
}: Props) {
  const [round, setRound] = useState<QuizItem[]>(() => buildRound(items));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<QuizItem[]>([]);
  const [done, setDone] = useState(false);
  const [dayStreak, setDayStreak] = useState(() => currentDayStreak());
  const [roundsToday, setRoundsToday] = useState(() => roundsCompletedToday());

  const question = round[index] ?? null;
  const options = useMemo(
    () => (question ? buildOptions(question, items, allItems) : []),
    // A fresh option set per question; `selected` is excluded so answering
    // doesn't reshuffle the buttons under the user's finger.
    [question, items, allItems]
  );

  function startRound(pool: QuizItem[]) {
    setRound(buildRound(pool));
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setMissed([]);
    setDone(false);
  }

  // Rebuild when the filter changes.
  const itemsKey = useMemo(() => items.map((i) => i.id).join(","), [items]);
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    startRound(items);
  }

  if (!question && !done) {
    return <p>No questions in this category yet.</p>;
  }

  function choose(option: string) {
    if (selected) return;
    setSelected(option);

    const isCorrect = option === question!.correctAnswer;
    recordAnswer(isCorrect);
    if (isCorrect) setCorrectCount((c) => c + 1);
    else setMissed((m) => [...m, question!]);
  }

  function next() {
    const finished = index + 1 >= round.length;
    if (!finished) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }

    // Score is recorded once, here — not per answer.
    const pct = Math.round((correctCount / round.length) * 100);
    const progress = recordRoundComplete(categoryFilter === "all" ? null : categoryFilter, pct);
    setDayStreak(currentDayStreak(progress));
    setRoundsToday(roundsCompletedToday(progress));
    setDone(true);
  }

  if (done) {
    const pct = Math.round((correctCount / round.length) * 100);
    const cleared = pct >= STAGE_CLEAR_SCORE;
    const goalHit = roundsToday >= DAILY_GOAL;

    return (
      <div className="round-done">
        <p className="round-done-score">
          {correctCount} / {round.length}
        </p>
        <p className="round-done-pct">{pct}%</p>

        <p className="round-done-sub">
          {cleared
            ? categoryFilter === "all"
              ? "Strong round."
              : "Stage cleared."
            : `${STAGE_CLEAR_SCORE}% clears this stage — one more go?`}
        </p>

        <div className="round-meta">
          <span>{dayStreak === 1 ? "1 day streak" : `${dayStreak} day streak`}</span>
          <span>
            {goalHit ? "Daily goal hit" : `${roundsToday} / ${DAILY_GOAL} rounds today`}
          </span>
        </div>

        <div className="controls">
          {missed.length > 0 && (
            <button type="button" className="review-primary" onClick={() => startRound(missed)}>
              Retry the {missed.length} you missed
            </button>
          )}
          <button
            type="button"
            className={missed.length > 0 ? "" : "review-primary"}
            onClick={() => startRound(items)}
          >
            Another round
          </button>
          {cleared && nextStageId && nextStageId !== categoryFilter && (
            <button type="button" onClick={() => onChooseCategory(nextStageId)}>
              Next: {nextStageTitle}
            </button>
          )}
        </div>
      </div>
    );
  }

  const answered = selected !== null;
  const gotItRight = answered && selected === question!.correctAnswer;

  return (
    <div className="test-mode">
      <div className="round-bar" aria-hidden="true">
        <div
          className="round-bar-fill"
          style={{ width: `${(index / round.length) * 100}%` }}
        />
      </div>

      <div className="stats">
        <span>
          Question {index + 1} of {round.length}
        </span>
        <span>
          {correctCount} correct{dayStreak > 0 && ` · ${dayStreak}d streak`}
        </span>
      </div>

      <p className="category-tag">{question!.categoryTitle}</p>
      <p className="quiz-prompt">{question!.prompt}</p>
      <p className="quiz-front">
        {question!.front}
        {question!.frontTranslation && <span className="en"> — {question!.frontTranslation}</span>}
      </p>

      <div className="options">
        {options.map((option) => {
          const isCorrectOption = option === question!.correctAnswer;
          const isSelected = option === selected;
          let className = "option";
          if (answered) {
            if (isCorrectOption) className += " correct";
            else if (isSelected) className += " incorrect";
          }
          return (
            <button
              key={option}
              type="button"
              className={className}
              onClick={() => choose(option)}
              disabled={answered}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <p className={`answer-feedback ${gotItRight ? "right" : "wrong"}`}>
            {gotItRight ? "Correct" : `Answer: ${question!.correctAnswer}`}
            {!gotItRight && question!.correctAnswerTranslation && (
              <span className="en"> — {question!.correctAnswerTranslation}</span>
            )}
          </p>
          <button type="button" className="next-question" onClick={next}>
            {index + 1 >= round.length ? "Finish round" : "Next question →"}
          </button>
        </>
      )}
    </div>
  );
}
