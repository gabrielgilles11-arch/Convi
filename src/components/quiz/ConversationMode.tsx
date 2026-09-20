import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  gradeReply,
  hasSlot,
  nextBeat,
  type Conversation,
  type ConvLine,
  type ConvTurn,
  type ReplyVerdict,
} from "../../lib/conversationTypes";
import { normalizeAnswer } from "../../lib/quizTypes";
import AudioButton from "./AudioButton";
import { speak, speakInTurn, stopSpeaking } from "./speech";

/**
 * Talk Mode: a conversation held in the target language.
 *
 * The screen speaks first and it speaks Spanish, or Swedish, or German. No
 * English appears in the dialogue unless it is asked for, because the moment a
 * translation sits under every line, that is the line people read. Tapping any
 * line shows its meaning on its own, which is the version of that escape hatch
 * that costs nothing until you use it.
 *
 * You answer by typing, with nothing on screen to copy: the lines the beat was
 * written with appear after you have said something, not before, so the beat is
 * a question rather than a multiple choice. What you type is graded against
 * every one of them, and generously (see `replyMatches`) — "café" is what
 * somebody actually says to a barista, and marking it wrong because the
 * authored line reads "Un café con leche, por favor" teaches recitation.
 *
 * What you say also decides where the conversation goes. Say you only want a
 * drink and the beat about ordering food is stepped over rather than asked
 * anyway; see `nextBeat`. Every line on every path was still written by a
 * person — the branching picks between authored beats, it does not invent one.
 */
interface Props {
  conversation: Conversation;
  locale: string;
  onBack: () => void;
  /** Called the first time the conversation is walked to its end. */
  onFinish: (id: string) => void;
}

/** What was actually said on a beat, once it is settled. */
interface Said {
  /** The authored line it counts as. */
  line: ConvLine;
  /** What they typed, where they typed something. Null if they asked to see it. */
  typed: string | null;
  correct: boolean;
  close: boolean;
}

/** The line they said, in English, as the signal for where to go next. */
function intentOf(said: Said | undefined): string | null {
  if (!said) return null;
  return said.line.en ?? said.line.source;
}

/** True where what they typed is the line rather than a shorter way to say it. */
function saidItInFull(said: Said): boolean {
  if (!said.typed) return true;
  return normalizeAnswer(said.typed) === normalizeAnswer(said.line.source);
}

/**
 * A line of the dialogue, with its meaning one tap away.
 *
 * The translation is a popover rather than a second line under every bubble:
 * the point of the screen is that the language on it is the one being learned,
 * and a gloss that is always there is the line people read. Only the bubble
 * asked for opens, so the transcript never fills up with English.
 */
function Bubble({
  line,
  side,
  locale,
  english,
  openKey,
  popKey,
  onPop,
}: {
  line: ConvLine;
  side: "them" | "you";
  locale: string;
  english: boolean;
  openKey: string | null;
  popKey: string;
  onPop: (key: string | null) => void;
}) {
  const open = openKey === popKey;
  const canPop = Boolean(line.en);

  return (
    <div className={`convo-bubble convo-bubble--${side}${open ? " is-open" : ""}`}>
      <p className="convo-source">
        <button
          type="button"
          className="convo-tap"
          onClick={() => onPop(open ? null : popKey)}
          aria-expanded={canPop ? open : undefined}
          disabled={!canPop}
          title={canPop ? "What this means" : undefined}
        >
          {line.source}
        </button>
        <AudioButton locale={locale} audioId={line.audioId} text={line.source} surface="practice" />
      </p>
      {open && line.en && (
        <p className="convo-pop" role="note">
          {line.en}
        </p>
      )}
      {english && line.en && !open && <p className="convo-en">{line.en}</p>}
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
function Correction({ said, locale }: { said: Said; locale: string }) {
  return (
    <div className="convo-correction">
      <p className="convo-correction-head">
        {said.typed === null
          ? "Here's the line:"
          : said.close
            ? "Almost. It goes like this:"
            : "Not quite. Here's the line:"}
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

/** The other things that would have worked here, shown once you've answered. */
function AlsoWorks({
  turn,
  said,
  locale,
}: {
  turn: ConvTurn;
  said: Said;
  locale: string;
}) {
  const others = turn.yourLines.filter((line) => line.source !== said.line.source);
  if (others.length === 0) return null;

  return (
    <div className="convo-also">
      <p className="convo-also-label">You could also have said</p>
      <ul>
        {others.map((line) => (
          <li key={line.audioId ?? line.source}>
            <span>{line.source}</span>
            <AudioButton
              locale={locale}
              audioId={line.audioId}
              text={line.source}
              surface="practice"
            />
            {hasSlot(line.source) && <span className="convo-choice-slot">fill in the blank</span>}
            {line.en && <span className="convo-also-en">{line.en}</span>}
          </li>
        ))}
      </ul>
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
  openKey,
  onPop,
  children,
}: {
  turn: ConvTurn;
  index: number;
  locale: string;
  said: Said | undefined;
  english: boolean;
  active: boolean;
  openKey: string | null;
  onPop: (key: string | null) => void;
  children?: React.ReactNode;
}) {
  // The situation is English, so it only appears where nothing else can do its
  // job: a beat you open has no line of theirs to react to, and without the cue
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
        <Bubble
          line={turn.theirOpener}
          side="them"
          locale={locale}
          english={english}
          openKey={openKey}
          popKey={`${turn.id}-them`}
          onPop={onPop}
        />
      )}

      {said && (
        <>
          {/* What you actually said goes in your bubble, right or wrong. The
              full line sits under it where you said a shorter version of it,
              and the correction where you said something else: replacing your
              own half of the transcript with the authored line would quietly
              rewrite what happened. */}
          {said.typed === null ? (
            said.correct ? (
              <Bubble
                line={said.line}
                side="you"
                locale={locale}
                english={english}
                openKey={openKey}
                popKey={`${turn.id}-you`}
                onPop={onPop}
              />
            ) : null
          ) : (
            <div className={`convo-bubble convo-bubble--you${said.correct ? "" : " is-wrong"}`}>
              <p className="convo-source">{said.typed}</p>
            </div>
          )}

          {said.correct && said.typed !== null && !saidItInFull(said) && (
            <p className="convo-full">
              <span className="convo-full-label">in full</span>
              {said.line.source}
              <AudioButton
                locale={locale}
                audioId={said.line.audioId}
                text={said.line.source}
                surface="practice"
              />
            </p>
          )}

          {!said.correct && <Correction said={said} locale={locale} />}

          {turn.theirReply && (
            <Bubble
              line={turn.theirReply}
              side="them"
              locale={locale}
              english={english}
              openKey={openKey}
              popKey={`${turn.id}-reply`}
              onPop={onPop}
            />
          )}

          <AlsoWorks turn={turn} said={said} locale={locale} />

          {english && turn.note && <p className="convo-note">{turn.note}</p>}
        </>
      )}

      {children}
    </li>
  );
}

export default function ConversationMode({ conversation, locale, onBack, onFinish }: Props) {
  const turns = conversation.turns;

  /** The beats walked so far, in order. Branching makes this not 0,1,2,3. */
  const [route, setRoute] = useState<number[]>([0]);
  /** Beats stepped over because of what was said. Only used for the count. */
  const [skipped, setSkipped] = useState<number[]>([]);
  const [said, setSaid] = useState<Record<number, Said>>({});
  const [typed, setTyped] = useState("");
  const [english, setEnglish] = useState(false);
  const [done, setDone] = useState(false);
  /** Which line is showing its meaning. One at a time. */
  const [openKey, setOpenKey] = useState<string | null>(null);

  const step = route[route.length - 1]!;
  const current = turns[step];
  const settled = said[step] !== undefined;

  // Openers are announced once each. Without this, any re-render that touches
  // the effect's inputs would start the line again mid-sentence.
  const announced = useRef<Set<number>>(new Set());

  function reset() {
    setRoute([0]);
    setSkipped([]);
    setSaid({});
    setTyped("");
    setDone(false);
    setOpenKey(null);
    announced.current = new Set();
  }

  // A new conversation is a new transcript; without this, opening a second one
  // would keep the first one's answers.
  useEffect(reset, [conversation.id, turns]);

  // A line still being read while the next beat opens is worse than not
  // hearing it at all — the same rule the round screens follow.
  useEffect(() => {
    return () => stopSpeaking();
  }, [conversation.id]);

  /**
   * Their line, said out loud the moment the beat opens.
   *
   * This is a conversation, and somebody talking to you is the whole of what
   * makes it one. Reading it silently and tapping a speaker afterwards is a
   * flashcard with extra steps.
   */
  useEffect(() => {
    if (done) return;
    const turn = turns[step];
    if (!turn?.theirOpener || announced.current.has(step)) return;
    announced.current.add(step);
    void speak(locale, turn.theirOpener.audioId, turn.theirOpener.source, "practice");
  }, [step, done, turns, locale]);

  const inputRef = useRef<HTMLInputElement>(null);
  const tail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (route.length === 1 || done) return;
    tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Focus follows the conversation, so a second answer needs no second tap.
    inputRef.current?.focus({ preventScroll: true });
  }, [route.length, done]);

  const correctCount = useMemo(
    () => Object.values(said).filter((s) => s.correct).length,
    [said]
  );

  /** How long this run is: everything except what your answers stepped over. */
  const total = turns.length - skipped.length;

  function settle(verdict: ReplyVerdict, raw: string | null) {
    const entry: Said = {
      line: verdict.line,
      typed: raw,
      correct: verdict.correct,
      close: verdict.close,
    };
    setSaid((prev) => ({ ...prev, [step]: entry }));
    setTyped("");
    setOpenKey(null);

    // Your line, then theirs, one after the other: hearing the exchange is the
    // point of having held it. The corrected line is the one spoken where the
    // answer was wrong — it is the line worth copying either way.
    const reply = turns[step]?.theirReply;
    void speakInTurn(
      locale,
      [
        { audioId: entry.line.audioId, text: entry.line.source },
        ...(reply ? [{ audioId: reply.audioId, text: reply.source }] : []),
      ],
      "practice"
    );
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (settled || !typed.trim() || !current) return;
    settle(gradeReply(typed, current.yourLines), typed.trim());
  }

  /** Stuck. Shows the line rather than leaving the conversation nowhere to go. */
  function reveal() {
    if (settled || !current) return;
    settle({ correct: false, line: current.yourLines[0]!, close: false }, null);
  }

  function advance() {
    const next = nextBeat(turns, step, intentOf(said[step]), skipped.length);
    if (!next) {
      setDone(true);
      onFinish(conversation.id);
      stopSpeaking();
      return;
    }
    if (next.skipped.length > 0) setSkipped((prev) => [...prev, ...next.skipped]);
    setRoute((prev) => [...prev, next.index]);
  }

  const lastBeat = nextBeat(turns, step, intentOf(said[step]), skipped.length) === null;

  return (
    <div className="convo-mode">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          All conversations
        </button>
        <span>{conversation.title}</span>
        {/* Off by default and never automatic. Tapping a single line is the
            everyday way to check one; this is for the beat where you want the
            whole thing side by side. */}
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
            style={{ width: `${((done ? total : route.length - 1) / total) * 100}%` }}
          />
        </div>
        <div className="stats">
          <span>
            Turn {Math.min(route.length, total)} of {total}
          </span>
          <span>{conversation.categoryTitle}</span>
        </div>
      </div>

      <ol className="convo-transcript">
        {route.map((index, position) => {
          const turn = turns[index];
          if (!turn) return null;
          return (
            <Beat
              key={turn.id}
              turn={turn}
              index={position}
              locale={locale}
              said={said[index]}
              english={english}
              active={index === step && !done}
              openKey={openKey}
              onPop={setOpenKey}
            >
              {index === step && !done && !settled && (
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
                  {/* The way out for a beat you have no idea about. Deliberately
                      quieter than the input: the answer is worth having once
                      you have tried, and worth nothing before. */}
                  <button type="button" className="convo-stuck" onClick={reveal}>
                    I don't know — show me
                  </button>
                </div>
              )}
            </Beat>
          );
        })}
      </ol>

      <div ref={tail} />

      {done ? (
        <div className="convo-done convo-congrats">
          <div className="congrats-burst" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M5 12.5 L10 17.5 L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="congrats-title">¡Conversation complete!</p>
          <p className="congrats-score">
            {correctCount} / {route.length}
          </p>
          <p className="convo-done-sub">
            {correctCount === route.length
              ? "Every line landed, start to finish, none of it in English."
              : `${route.length} turns held in ${conversation.title.toLowerCase()}, none of it in English.`}{" "}
            Run it again and answer differently: the conversation takes a
            different road depending on what you say.
          </p>
          <div className="controls">
            <button type="button" className="review-primary" onClick={reset}>
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
