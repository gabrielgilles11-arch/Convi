import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  gradeReply,
  hasSlot,
  type Conversation,
  type ConvLine,
  type ConvTurn,
  type ReplyVerdict,
} from "../../lib/conversationTypes";
import { shuffle } from "../../lib/quizTypes";
import AudioButton from "./AudioButton";
import { stopSpeaking } from "./speech";

/**
 * Talk Mode: a conversation held in the target language.
 *
 * The screen speaks first and it speaks Spanish — or Swedish, or German. No
 * English appears anywhere in the dialogue unless it is asked for, because the
 * moment a translation sits under every line, that is the line people read.
 * The one exception is a beat you open, where there is no line of theirs to
 * react to and a stage direction is the only thing that can say what you want.
 *
 * You answer by typing. What you type is graded against *every* line the beat
 * was written with, not just the first — where a beat has a polite version and
 * a blunt one, both are things people say there. Get it wrong and you are
 * corrected in both languages and the conversation carries on: this is a
 * conversation, not a test, and the round screens are the test.
 *
 * The written lines are still on offer, in a different order every run, for
 * anybody who would otherwise be stuck staring at an empty box.
 *
 * Nothing branches. The content has one next line per beat, and inventing the
 * others would mean teaching lines nobody wrote.
 */
interface Props {
  conversation: Conversation;
  locale: string;
  onBack: () => void;
  /** Called the first time the last beat is reached. */
  onFinish: (id: string) => void;
}

/** What was actually said on a beat, once it is settled. */
interface Said {
  /** The authored line it counts as. */
  line: ConvLine;
  /** What they typed, when they typed it and got it wrong. */
  typed: string | null;
  close: boolean;
}

function Bubble({
  line,
  side,
  locale,
  english,
}: {
  line: ConvLine;
  side: "them" | "you";
  locale: string;
  english: boolean;
}) {
  return (
    <div className={`convo-bubble convo-bubble--${side}`}>
      <p className="convo-source">
        {line.source}
        <AudioButton locale={locale} audioId={line.audioId} text={line.source} surface="practice" />
      </p>
      {english && line.en && <p className="convo-en">{line.en}</p>}
    </div>
  );
}

/**
 * The correction.
 *
 * Both languages, always, and in that order: the line you should have said,
 * then what it means. Showing only the target language leaves somebody who
 * misunderstood the question no way to find that out, and showing only English
 * does not teach the line.
 */
function Correction({
  said,
  locale,
}: {
  said: Said;
  locale: string;
}) {
  return (
    <div className="convo-correction">
      <p className="convo-correction-head">
        {said.close ? "Almost — it goes like this:" : "Not quite. Here's the line:"}
      </p>
      <p className="convo-correction-line">
        {said.line.source}
        <AudioButton
          locale={locale}
          audioId={said.line.audioId}
          text={said.line.source}
          surface="practice"
        />
      </p>
      {said.line.en && <p className="convo-correction-en">{said.line.en}</p>}
    </div>
  );
}

function Beat({
  turn,
  index,
  locale,
  said,
  english,
  active,
  children,
}: {
  turn: ConvTurn;
  index: number;
  locale: string;
  said: Said | null;
  english: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  // The situation is English, so it only appears where nothing else can do its
  // job: a beat you open has no line of theirs to answer, and without the cue
  // there is no way to know what you are meant to want. Where they speak
  // first, their line is the prompt and the cue hides behind the toggle.
  const showCue = !turn.theirOpener || english;

  return (
    <li className={`convo-beat${active ? " is-active" : ""}`}>
      {showCue && (
        <p className="convo-situation">
          <span className="convo-beat-n" aria-hidden="true">
            {index + 1}
          </span>
          {turn.situation}
        </p>
      )}

      {turn.theirOpener && (
        <Bubble line={turn.theirOpener} side="them" locale={locale} english={english} />
      )}

      {said && (
        <>
          {/* What you actually said goes in your bubble, right or wrong. The
              correction sits under it with the line you were reaching for —
              putting the right line in the bubble instead would quietly rewrite
              your own half of the transcript. */}
          {said.typed === null ? (
            <Bubble line={said.line} side="you" locale={locale} english={english} />
          ) : (
            <>
              <div className="convo-bubble convo-bubble--you is-wrong">
                <p className="convo-source">{said.typed}</p>
              </div>
              <Correction said={said} locale={locale} />
            </>
          )}
          {turn.theirReply && (
            <Bubble line={turn.theirReply} side="them" locale={locale} english={english} />
          )}
          {english && turn.note && <p className="convo-note">{turn.note}</p>}
        </>
      )}

      {children}
    </li>
  );
}

export default function ConversationMode({ conversation, locale, onBack, onFinish }: Props) {
  const turns = conversation.turns;

  const [step, setStep] = useState(0);
  const [said, setSaid] = useState<(Said | null)[]>(() => turns.map(() => null));
  const [typed, setTyped] = useState("");
  const [english, setEnglish] = useState(false);
  const [done, setDone] = useState(false);

  // A new conversation is a new transcript; without this, opening a second one
  // would keep the first one's answers.
  useEffect(() => {
    setStep(0);
    setSaid(turns.map(() => null));
    setTyped("");
    setDone(false);
  }, [conversation.id, turns]);

  // A line still being read while the next beat opens is worse than not
  // hearing it at all — the same rule the round screens follow.
  useEffect(() => {
    return () => stopSpeaking();
  }, [conversation.id]);

  const current = turns[step];
  const settled = step < turns.length ? said[step] !== null : true;
  const lastBeat = step === turns.length - 1;

  /**
   * The written lines, in a different order every beat and every run.
   *
   * Shuffled rather than authored-order because the first option is otherwise
   * always the answer the deck would have marked, and a list whose first entry
   * is always right teaches the position rather than the language.
   */
  const offered = useMemo(
    () => (current ? shuffle(current.yourLines) : []),
    // Re-shuffled per beat, and again if the conversation is restarted.
    [current, step, conversation.id, done]
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const tail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 0 || done) return;
    tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Focus follows the conversation, so a second answer needs no second tap.
    inputRef.current?.focus({ preventScroll: true });
  }, [step, done]);

  function settle(verdict: ReplyVerdict, raw: string | null) {
    setSaid((prev) => {
      const next = [...prev];
      next[step] = {
        line: verdict.line,
        typed: verdict.correct ? null : raw,
        close: verdict.close,
      };
      return next;
    });
    setTyped("");
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (settled || !typed.trim() || !current) return;
    settle(gradeReply(typed, current.yourLines), typed.trim());
  }

  /** Tapping a written line is saying it — there is nothing to get wrong. */
  function say(line: ConvLine) {
    if (settled) return;
    settle({ correct: true, line, close: false }, null);
  }

  function advance() {
    if (lastBeat) {
      setDone(true);
      onFinish(conversation.id);
      return;
    }
    setStep((s) => s + 1);
  }

  function startOver() {
    setStep(0);
    setSaid(turns.map(() => null));
    setTyped("");
    setDone(false);
  }

  return (
    <div className="convo-mode">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          All conversations
        </button>
        <span>{conversation.title}</span>
        {/* Off by default and never automatic. The whole point of the screen is
            that the language on it is the one being learned; this is the escape
            hatch for the beat where that stops being useful. */}
        <button
          type="button"
          className="convo-english-toggle"
          aria-pressed={english}
          onClick={() => setEnglish((on) => !on)}
        >
          {english ? "Hide English" : "Show English"}
        </button>
      </p>

      <div className="round-head">
        <div className="round-bar" aria-hidden="true">
          <div
            className="round-bar-fill"
            style={{ width: `${((done ? turns.length : step) / turns.length) * 100}%` }}
          />
        </div>
        <div className="stats">
          <span>
            Turn {Math.min(step + 1, turns.length)} of {turns.length}
          </span>
          <span>{conversation.categoryTitle}</span>
        </div>
      </div>

      <ol className="convo-transcript">
        {turns.slice(0, step + 1).map((turn, i) => (
          <Beat
            key={turn.id}
            turn={turn}
            index={i}
            locale={locale}
            said={said[i] ?? null}
            english={english}
            active={i === step && !done}
          >
            {i === step && !done && !settled && (
              <div className="convo-reply">
                <form className="convo-type" onSubmit={submit}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Say it back…"
                    aria-label="Your reply, in the language you're learning"
                    autoComplete="off"
                    autoCapitalize="sentences"
                    spellCheck={false}
                  />
                  <button type="submit" disabled={!typed.trim()}>
                    Say it
                  </button>
                </form>

                <p className="convo-choices-label">or say one of these</p>
                <div className="convo-choices">
                  {offered.map((line) => (
                    <button
                      type="button"
                      className="convo-choice"
                      key={line.audioId ?? line.source}
                      onClick={() => say(line)}
                    >
                      <span className="convo-choice-source">{line.source}</span>
                      {/* A blank is authored — the street, the amount, the
                          station — so it is worth saying so rather than letting
                          it look like text that failed to load. */}
                      {hasSlot(line.source) && (
                        <span className="convo-choice-slot">fill in the blank</span>
                      )}
                      {english && line.en && (
                        <span className="convo-choice-en">{line.en}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Beat>
        ))}
      </ol>

      <div ref={tail} />

      {done ? (
        <div className="convo-done">
          <p className="convo-done-title">That's the whole conversation.</p>
          <p className="convo-done-sub">
            {turns.length} turns, start to finish, none of it in English. Run it
            again and answer differently — every line you were offered is a real
            thing to say there.
          </p>
          <div className="controls">
            <button type="button" className="review-primary" onClick={startOver}>
              Run it again
            </button>
            <button type="button" onClick={onBack}>
              Another conversation
            </button>
          </div>
        </div>
      ) : (
        settled && (
          <div className="controls convo-controls">
            <button type="button" className="review-primary" onClick={advance}>
              {lastBeat ? "Finish" : "Next line"}
            </button>
          </div>
        )
      )}
    </div>
  );
}
