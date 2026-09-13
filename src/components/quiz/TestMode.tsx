import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRound,
  answersMatch,
  STAGE_CLEAR_SCORE,
  type Question,
  type QuizItem,
} from "../../lib/quizTypes";
import AudioButton from "./AudioButton";
import MatchQuestion from "./MatchQuestion";
import { playCorrect, playWrong } from "./sound";
import { speak, stopSpeaking } from "./speech";
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
  /**
   * Everything reached so far: this stage plus the ones before it. Used to
   * backfill a round, its distractors and its decoys — never the whole deck,
   * so nothing from a later stage can surface early.
   */
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
  /**
   * Builds the round. Defaults to the usual mix; the taster passes its own
   * fixed six so it can open on arriving in the country.
   */
  makeRound?: (items: QuizItem[], allItems: QuizItem[]) => Question[];
  /**
   * The taster runs the same screens under different rules: nothing is scored,
   * a miss doesn't come back around, and it ends by handing over to the path.
   * Somebody who has owned the app for ninety seconds is being shown what it
   * is, not tested on it.
   */
  taster?: boolean;
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

// Each choice gets a letter so it can be named. Colour used to vary per slot
// too, which turned out to read as meaning — four hues plus green and red is
// too many things for colour to be saying at once. All four boxes now share
// the edition tint and only the letter tells them apart.
// buildOptions caps a round at four; the modulo only guards against that
// changing underneath us.
const OPTION_KEYS = ["A", "B", "C", "D"];

function MarkIcon({ right }: { right: boolean }) {
  return (
    <svg className="option-mark" viewBox="0 0 24 24" aria-hidden="true">
      {right ? (
        <path
          d="M5 12.5 L10 17.5 L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M7 7 L17 17 M17 7 L7 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

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

/**
 * The target-language side of a question — the half worth hearing.
 *
 * Which half that is depends on the direction it was asked in: producing the
 * line puts it in the answer, reading it puts it in the prompt. A matching
 * screen has several lines and no single one to say.
 */
function spokenLine(q: Question): { text: string; audioId: string | null } | null {
  if (q.form === "match") return null;
  return q.answerLang === "source"
    ? { text: q.answer, audioId: q.answerAudio }
    : { text: q.shown, audioId: q.shownAudio };
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
  makeRound = buildRound,
  taster = false,
}: Props) {
  const [round, setRound] = useState<Question[]>(() => makeRound(items, allItems));
  /**
   * Positions in `round` still to be answered correctly. A wrong answer sends
   * its question to the back rather than dropping it, so a round is not over
   * until every question in it has been got right — the set repeats what you
   * missed until you finish it.
   */
  const [queue, setQueue] = useState<number[]>(() => round.map((_, i) => i));
  /** Positions already attempted once, which is what the score is taken from. */
  const [attempted, setAttempted] = useState<number[]>([]);
  /**
   * Positions that have come back around after being missed. Separate from
   * `attempted`, which starts including the current question the instant it is
   * answered — reading the flag off that lit "Again" on every question as soon
   * as you'd answered it, which is the one moment it cannot be true.
   */
  const [repeats, setRepeats] = useState<number[]>([]);
  /** Bumped on every question change so a repeated screen remounts clean. */
  const [attempt, setAttempt] = useState(0);
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

  const position = queue.length > 0 ? queue[0] : -1;
  const question = round[position] ?? null;
  const cleared = round.length - queue.length;
  /** True when this question has come back around after being missed. */
  const isRepeat = repeats.includes(position);

  // The verdict drawer is pinned to the bottom of the viewport, so on a short
  // screen it can land on top of the options you just answered. Bring them back
  // into view rather than leaving the learner to guess there's more above it.
  const answerArea = useRef<HTMLDivElement>(null);
  const voiceTimer = useRef(0);

  // Leaving a question — or the round — stops it mid-sentence. A line still
  // being read over the next question is worse than not hearing it at all.
  useEffect(() => {
    return () => {
      window.clearTimeout(voiceTimer.current);
      stopSpeaking();
    };
  }, [position, attempt]);
  useEffect(() => {
    if (!answered) return;
    const el = answerArea.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // "end" plus the scroll margins in CSS parks the answers in the gap between
    // the sticky header and the drawer. Centring instead over-scrolled: it
    // counted the drawer-clearance padding as content and pushed the options
    // up behind the header.
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [answered, position, attempt]);

  function resetQuestion() {
    setAnswered(false);
    setWasRight(false);
    setChoice(null);
    setTyped("");
    setAssembled([]);
  }

  function startRound(pool: QuizItem[]) {
    const next = makeRound(pool, allItems);
    setRound(next);
    setQueue(next.map((_, i) => i));
    setAttempted([]);
    setRepeats([]);
    setAttempt(0);
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

  /**
   * Scores the current question. `results` overrides which items go to the
   * mistake queue — a matching screen settles several items at once, and only
   * the rows that actually went wrong belong in the queue.
   */
  function settle(correct: boolean, results?: { itemId: string; correct: boolean }[]) {
    setAnswered(true);
    setWasRight(correct);
    if (!taster) recordAnswer(correct);
    if (correct) playCorrect();
    else playWrong();

    // The line is said out loud the moment the question settles: answering is
    // when you want to hear it, and it saves a tap on the one screen where the
    // learner's hands are already busy. Held back a beat so it doesn't play
    // over the feedback tone — two sounds at once is neither.
    const line = spokenLine(question!);
    if (line) {
      window.clearTimeout(voiceTimer.current);
      voiceTimer.current = window.setTimeout(() => {
        void speak(locale, line.audioId, line.text, "practice");
      }, 380);
    }

    // Only the first go at a question counts. Without this the round would
    // always end at 100% — you cannot leave it until everything is right — and
    // the clear threshold would stop meaning anything. It also keeps the
    // mistake queue honest: getting it on the third attempt inside one round
    // shouldn't erase the fact that you missed it.
    if (attempted.includes(position)) return;
    setAttempted((a) => [...a, position]);
    // The taster leaves no trace: no score, and nothing dropped into the
    // mistake queue before the learner has met the material.
    if (!taster) {
      if (results) {
        for (const r of results) recordQuestionResult(r.itemId, r.correct);
      } else {
        recordQuestionResult(question!.itemId, correct);
      }
    }
    if (correct) setCorrectCount((c) => c + 1);
  }

  function submitChoice(option: string) {
    if (answered) return;
    setChoice(option);
    settle(answersMatch(option, question!.answer));
  }

  function submitTyped(event: React.SubmitEvent) {
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
    // Right: the question leaves the set. Wrong: it goes to the back and comes
    // round again later. The queue is left untouched on the last one so the
    // summary can render without the current question vanishing from under it.
    //
    // A matching screen is the exception. It only ends when every row has been
    // paired correctly, so by the time you leave it there is nothing left to
    // re-answer — "wrong" there means you needed more than one go, which costs
    // the score but is not a reason to rebuild the board. Repeating it would
    // trap anyone who slipped once into redoing all four rows until they
    // managed a clean sweep.
    // The taster never sends a question back around. Six questions is a look
    // at the deck, and being made to redo the one you got wrong turns the first
    // ninety seconds of ownership into a test.
    const settled = taster || wasRight || question?.form === "match";
    const remaining = settled ? queue.slice(1) : [...queue.slice(1), position];
    if (!settled) setRepeats((r) => (r.includes(position) ? r : [...r, position]));
    if (remaining.length > 0) {
      setQueue(remaining);
      setAttempt((a) => a + 1);
      resetQuestion();
      return;
    }

    if (!taster) {
      const pct = Math.round((correctCount / round.length) * 100);
      const progress = recordRoundComplete(scoreKey, pct);
      setDayStreak(currentDayStreak(progress));
      setRoundsToday(roundsCompletedToday(progress));
      setMistakeCount(progress.missedItemIds.length);
      onRoundComplete();
    }
    setDone(true);
  }

  if (done && taster) {
    return (
      <div className="round-done">
        <p className="round-done-score">
          {correctCount} / {round.length}
        </p>
        <p className="round-done-sub taster-done">
          That's the shape of it. Nothing here was scored — the path is where it
          counts, one stage at a time, and it starts wherever you like.
        </p>
        <div className="controls">
          <button type="button" className="review-primary" onClick={onBackToPath}>
            Start practising
          </button>
        </div>
      </div>
    );
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
  const spoken = spokenLine(q);
  // The generator names a reply clip after its exchange, which is the item id.
  const replyAudioId = q.reply ? `${q.itemId}-r` : null;
  // Tiles are tracked as `word\u0000index` so a repeated word stays distinct.
  const tokenOf = (tile: string, i: number) => `${tile}\u0000${i}`;
  const wordOf = (token: string) => token.slice(0, token.lastIndexOf("\u0000"));

  return (
    <div className={`test-mode${answered ? " is-answered" : ""}`}>
      <div className="round-head">
        <div className="round-bar" aria-hidden="true">
          <div className="round-bar-fill" style={{ width: `${(cleared / round.length) * 100}%` }} />
        </div>

        <div className="stats">
          <span>
            {/* Counts questions put away, not screens seen — a repeat is the
                same question coming back, so it must not advance the count. */}
            Question {cleared + 1} of {round.length}
            {isRepeat && <span className="repeat-flag">Again</span>}
          </span>
          <span>
            {correctCount} correct{dayStreak > 0 && ` \u00b7 ${dayStreak}d streak`}
          </span>
        </div>
      </div>

      {/* The question lives on its own white card so the thing you're being
          asked always sits apart from the answers, instead of running into the
          page. */}
      <div className="question-card">
        <p className="category-tag">{q.categoryTitle}</p>
        {/* A matching screen is its own instruction — there's no single line to
            show above it, so the card carries only the prompt. */}
        {q.form === "match" ? (
          <p className="quiz-front">{q.prompt}</p>
        ) : (
          <>
            <p className="quiz-prompt">{q.prompt}</p>
            <p className="quiz-front">
              {withBlanks(q.shown)}
              {q.shownSub && <span className="en">{withBlanks(q.shownSub)}</span>}
              {q.answerLang === "en" && (
                <AudioButton
                  locale={locale}
                  audioId={q.shownAudio}
                  text={q.shown}
                  label="Hear the phrase"
                />
              )}
            </p>
          </>
        )}
      </div>

      {q.form === "choice" && (
        <div className="options">
          {q.options.map((option, i) => {
            const isAnswer = answersMatch(option, q.answer);
            const isPicked = option === choice;
            let className = "option";
            if (answered) {
              // Everything that isn't the answer or your pick steps back, so
              // the two that matter are the two that stay lit.
              if (isAnswer) className += " correct";
              else if (isPicked) className += " incorrect";
              else className += " faded";
            }
            return (
              <button
                key={option}
                type="button"
                className={className}
                onClick={() => submitChoice(option)}
                disabled={answered}
              >
                <span className="option-key" aria-hidden="true">
                  {OPTION_KEYS[i % OPTION_KEYS.length]}
                </span>
                <span className="option-text">{withBlanks(option)}</span>
                {answered && (isAnswer || isPicked) && <MarkIcon right={isAnswer} />}
              </button>
            );
          })}
        </div>
      )}

      <div className="answer-area" ref={answerArea}>
      {q.form === "match" && (
        <MatchQuestion
          key={`${position}-${attempt}`}
          pairs={q.pairs}
          answered={answered}
          onDone={(clean, results) => settle(clean, results)}
        />
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
          <p className="type-hint">
            Accents, ß and punctuation are not marked wrong — and you never have to
            type the note in brackets.
          </p>
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

      </div>

      {answered && (
        <div className={`answer-drawer ${wasRight ? "right" : "wrong"}`} role="status">
          <div className="drawer-inner">
            <p className="drawer-verdict">
              <span className="feedback-badge" aria-hidden="true">
                <MarkIcon right={wasRight} />
              </span>
              <span className="feedback-title">
                {q.form === "match"
                  ? wasRight
                    ? "All matched!"
                    : "Matched \u2014 but not first time"
                  : wasRight
                    ? "Correct!"
                    : "Not quite"}
              </span>
            </p>

            {/* What you actually picked, when it wasn't the line. Small and
                above the exchange: it's worth seeing where you went, but the
                conversation below has to read as the conversation. */}
            {q.form !== "match" && !wasRight && choice && (
              <p className="drawer-picked">
                <span className="drawer-picked-label">you picked</span>
                {withBlanks(choice)}
              </p>
            )}

            {/* The exchange, both halves of it. Your line under "You said" —
                right or wrong, this is the one that belongs to the moment —
                and their comeback under it, so the scene plays out either way.
                Tap either line to hear it again. */}
            {q.form !== "match" && (q.saidByYou || !wasRight) && (
              <div className={`drawer-line${q.saidByYou ? " is-yours" : ""}`}>
                <p className="drawer-line-label">{q.saidByYou ? "You said" : "The answer"}</p>
                <div className="drawer-line-row">
                  <button
                    type="button"
                    className="drawer-line-text"
                    onClick={() => void speak(locale, spoken?.audioId ?? null, spoken?.text ?? q.answer, "practice")}
                  >
                    {withBlanks(q.answer)}
                  </button>
                  <AudioButton
                    locale={locale}
                    audioId={spoken?.audioId ?? null}
                    text={spoken?.text ?? q.answer}
                    label="Hear it again"
                  />
                </div>
                {q.answerSub && <p className="drawer-line-en">{withBlanks(q.answerSub)}</p>}
              </div>
            )}

            {/* The aside the author put on the line — register, region, tone.
                It is deliberately not part of what you type; it surfaces here,
                right or wrong, so the difference it marks lands at the moment
                you find out how you did. */}
            {q.form !== "match" && q.answerNote && (
              <p className="drawer-note">
                <span className="drawer-note-label">Note</span>
                {q.answerNote}
              </p>
            )}

            {/* The payoff: what comes back at you. Never asked as a question —
                shown here, right or wrong, so you always see the exchange
                through to its end. */}
            {q.reply && (
              <div className="drawer-line drawer-reply">
                <p className="drawer-line-label">They'll say back</p>
                <div className="drawer-line-row">
                  <button
                    type="button"
                    className="drawer-line-text"
                    onClick={() => void speak(locale, replyAudioId, q.reply!.source, "practice")}
                  >
                    {withBlanks(q.reply.source)}
                  </button>
                  <AudioButton
                    locale={locale}
                    audioId={replyAudioId}
                    text={q.reply.source}
                    label="Hear their reply"
                  />
                </div>
                {q.reply.en && <p className="drawer-line-en">{withBlanks(q.reply.en)}</p>}
              </div>
            )}

            <button type="button" className="next-question" onClick={next}>
              {(wasRight || q.form === "match") && queue.length === 1 ? "Finish round" : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
