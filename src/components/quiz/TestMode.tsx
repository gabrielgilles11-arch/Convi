import { useMemo, useState } from "react";
import {
  buildRound,
  answersMatch,
  STAGE_CLEAR_SCORE,
  type Question,
  type QuizItem,
} from "../../lib/quizTypes";
import AudioButton from "./AudioButton";
import {
  recordAnswer,
  recordQuestionResult,
  recordRoundComplete,
  currentDayStreak,
  roundsCompletedToday,
  DAILY_GOAL,
} from "../../lib/progress";

interface Props {
  /** Items in the current stage. */
  items: QuizItem[];
  /** The whole deck, used only to backfill distractors and decoys. */
  allItems: QuizItem[];
  /** Which edition's audio to look for. */
  locale: string;
  /** Identity of the current set — stage id, "all", or the mistakes id. */
  setId: string;
  /** Stage id to score against, or null for ad-hoc sets (all / mistakes). */
  scoreKey: string | null;
  nextStageId: string | null;
  nextStageTitle: string | null;
  onChooseStage: (id: string) => void;
  onDrillMistakes: () => void;
  onBackToPath: () => void;
  /** Lets the parent refresh its own mistake count once a round is scored. */
  onRoundComplete: () => void;
}

/**
 * Renders a line that contains a fill-in slot. `__` and `[BELOPP]` are authored
 * content, not missing data — the line genuinely has a blank in it, because the
 * amount or station changes every time you say it. Styling them makes that
 * legible instead of looking like text that failed to load.
 */
// Split keeps the delimiters; the anchored twin does the testing. A /g regex is
// stateful across .test() calls, so the two must be separate patterns.
const SLOT_SPLIT = /(_{2,}|\[[^\]]+\])/g;
const IS_SLOT = /^(_{2,}|\[[^\]]+\])$/;

function withBlanks(text: string) {
  const parts = text.split(SLOT_SPLIT);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (!IS_SLOT.test(part)) return part;
    // A bracketed slot names what goes in it ([BELOPP]); a bare ____ doesn't,
    // so the underline alone carries the meaning.
    const label = part.startsWith("[") ? part.slice(1, -1) : "\u00a0\u00a0";
    return (
      <span key={i} className="blank" title="This part changes each time">
        {label}
      </span>
    );
  });
}

export default function TestMode({
  items,
  allItems,
  locale,
  setId,
  scoreKey,
  nextStageId,
  nextStageTitle,
  onChooseStage,
  onDrillMistakes,
  onRoundComplete,
  onBackToPath,
}: Props) {
  const [round, setRound] = useState<Question[]>(() => buildRound(items, allItems));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wasRight, setWasRight] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [assembled, setAssembled] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [dayStreak, setDayStreak] = useState(() => currentDayStreak());
  const [roundsToday, setRoundsToday] = useState(() => roundsCompletedToday());
  // Read from the progress this round just wrote — a count passed in as a prop
  // is stale by the time the round ends.
  const [mistakeCount, setMistakeCount] = useState(0);

  const question = round[index] ?? null;

  function resetQuestion() {
    setAnswered(false);
    setWasRight(false);
    setChoice(null);
    setTyped("");
    setAssembled([]);
  }

  function startRound(pool: QuizItem[]) {
    setRound(buildRound(pool, allItems));
    setIndex(0);
    resetQuestion();
    setCorrectCount(0);
    setDone(false);
  }

  // Rebuild when the set changes. Keyed on the set's identity as well as its
  // contents: drilling mistakes can select exactly the items of the stage you
  // just failed, in the same order, so an items-only key stays byte-identical
  // and the round never restarts.
  const itemsKey = useMemo(
    () => `${setId}|${items.map((i) => i.id).join(",")}`,
    [setId, items]
  );
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    startRound(items);
  }

  if (!question && !done) {
    return <p>No questions in this set yet.</p>;
  }

  function settle(correct: boolean) {
    setAnswered(true);
    setWasRight(correct);
    recordAnswer(correct);
    recordQuestionResult(question!.itemId, correct);
    if (correct) setCorrectCount((c) => c + 1);
  }

  function submitChoice(option: string) {
    if (answered) return;
    setChoice(option);
    settle(answersMatch(option, question!.answer));
  }

  function submitTyped(event: React.FormEvent) {
    event.preventDefault();
    if (answered || !typed.trim()) return;
    settle(answersMatch(typed, question!.answer));
  }

  function submitBank() {
    if (answered || assembled.length === 0) return;
    const words = assembled.map((token) => token.slice(0, token.lastIndexOf("\u0000")));
    settle(answersMatch(words.join(" "), question!.answer));
  }

  function next() {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1);
      resetQuestion();
      return;
    }
    const pct = Math.round((correctCount / round.length) * 100);
    const progress = recordRoundComplete(scoreKey, pct);
    setDayStreak(currentDayStreak(progress));
    setRoundsToday(roundsCompletedToday(progress));
    setMistakeCount(progress.missedItemIds.length);
    onRoundComplete();
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
            ? scoreKey
              ? "Stage cleared."
              : "Strong round."
            : `${STAGE_CLEAR_SCORE}% clears this stage \u2014 one more go?`}
        </p>

        <div className="round-meta">
          <span>{dayStreak === 1 ? "1 day streak" : `${dayStreak} day streak`}</span>
          <span>{goalHit ? "Daily goal hit" : `${roundsToday} / ${DAILY_GOAL} rounds today`}</span>
        </div>

        <div className="controls">
          {mistakeCount > 0 && (
            <button type="button" className="review-primary" onClick={onDrillMistakes}>
              Fix your {mistakeCount} mistake{mistakeCount === 1 ? "" : "s"}
            </button>
          )}
          <button
            type="button"
            className={mistakeCount > 0 ? "" : "review-primary"}
            onClick={() => startRound(items)}
          >
            Another round
          </button>
          {cleared && nextStageId && (
            <button type="button" onClick={() => onChooseStage(nextStageId)}>
              Next: {nextStageTitle}
            </button>
          )}
          <button type="button" onClick={onBackToPath}>
            Back to path
          </button>
        </div>
      </div>
    );
  }

  const q = question!;
  // Tiles are tracked as `word\u0000index` so a repeated word stays distinct.
  const tokenOf = (tile: string, i: number) => `${tile}\u0000${i}`;
  const wordOf = (token: string) => token.slice(0, token.lastIndexOf("\u0000"));

  return (
    <div className="test-mode">
      <div className="round-bar" aria-hidden="true">
        <div className="round-bar-fill" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>

      <div className="stats">
        <span>
          Question {index + 1} of {round.length}
        </span>
        <span>
          {correctCount} correct{dayStreak > 0 && ` \u00b7 ${dayStreak}d streak`}
        </span>
      </div>

      <p className="category-tag">{q.categoryTitle}</p>
      <p className="quiz-prompt">{q.prompt}</p>
      <p className="quiz-front">
        {withBlanks(q.shown)}
        {q.shownSub && <span className="en">{" \u2014 "}{q.shownSub}</span>}
        <AudioButton locale={locale} audioId={q.shownAudio} label="Hear the prompt" />
      </p>

      {q.form === "choice" && (
        <div className="options">
          {q.options.map((option) => {
            let className = "option";
            if (answered) {
              if (answersMatch(option, q.answer)) className += " correct";
              else if (option === choice) className += " incorrect";
            }
            return (
              <button
                key={option}
                type="button"
                className={className}
                onClick={() => submitChoice(option)}
                disabled={answered}
              >
                {withBlanks(option)}
              </button>
            );
          })}
        </div>
      )}

      {q.form === "type" && (
        <form className="type-answer" onSubmit={submitTyped}>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your answer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={answered}
            aria-label="Type your answer"
          />
          {!answered && (
            <button type="submit" disabled={!typed.trim()}>
              Check
            </button>
          )}
          <p className="type-hint">Accents and punctuation are not marked wrong.</p>
        </form>
      )}

      {q.form === "bank" && (
        <div className="word-bank">
          <div className="bank-line" aria-label="Your answer">
            {assembled.length === 0 && (
              <span className="bank-placeholder">Tap the words in order</span>
            )}
            {assembled.map((token) => (
              <button
                key={token}
                type="button"
                className="tile placed"
                disabled={answered}
                onClick={() => setAssembled((a) => a.filter((t) => t !== token))}
              >
                {wordOf(token)}
              </button>
            ))}
          </div>

          <div className="bank-pool">
            {q.tiles.map((tile, i) => {
              const token = tokenOf(tile, i);
              if (assembled.includes(token)) return null;
              return (
                <button
                  key={token}
                  type="button"
                  className="tile"
                  disabled={answered}
                  onClick={() => setAssembled((a) => [...a, token])}
                >
                  {tile}
                </button>
              );
            })}
          </div>

          {!answered && (
            <button
              type="button"
              className="next-question"
              onClick={submitBank}
              disabled={assembled.length === 0}
            >
              Check
            </button>
          )}
        </div>
      )}

      {answered && (
        <>
          <p className={`answer-feedback ${wasRight ? "right" : "wrong"}`}>
            {wasRight ? "Correct" : <>Answer: {withBlanks(q.answer)}</>}
            <AudioButton locale={locale} audioId={q.answerAudio} label="Hear the answer" />
            {!wasRight && q.answerSub && <span className="en">{" \u2014 "}{q.answerSub}</span>}
          </p>
          <button type="button" className="next-question" onClick={next}>
            {index + 1 >= round.length ? "Finish round" : "Next question"}
          </button>
        </>
      )}
    </div>
  );
}
