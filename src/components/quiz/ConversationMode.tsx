import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  gradeReply,
  hasSlot,
  hintFor,
  nextBeat,
  readingTime,
  type Conversation,
  type ConvLine,
  type ConvTurn,
  type FollowingConversation,
  type ReplyVerdict,
} from "../../lib/conversationTypes";
import { normalizeAnswer } from "../../lib/quizTypes";
import AudioButton from "./AudioButton";
import { placeName } from "./ConversationPicker";
import { prefetchClips, speak, stopSpeaking } from "./speech";
import { registerOf, REGISTER_LABEL } from "../../lib/register";

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
 *
 * The rhythm is a messaging thread's, because that is the rhythm everybody
 * already reads as a conversation. Your line lands the moment you send it; they
 * take a beat, with the dots showing, before they answer; the answer stays long
 * enough to read; and the next thing arrives the same way. The box you type in
 * never goes away between beats. It used to be rebuilt on every one, which on a
 * phone meant the keyboard dropped and came back up after every single line.
 *
 * And a conversation ending is not the end of the chat. The next one written
 * for the same place, or the first one somewhere new, carries straight on
 * below, the way an evening goes from the table to the bill to the bar.
 */
interface Props {
  conversation: Conversation;
  locale: string;
  /** What comes after this one, for carrying straight on in the same thread. */
  following: FollowingConversation | null;
  onBack: () => void;
  /** Called the first time the conversation is walked to its end. */
  onFinish: (id: string) => void;
  /** Carry on into another conversation without leaving the thread. */
  onContinue: (id: string) => void;
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

/** A conversation already held in this sitting, kept above the current one. */
interface Held {
  conversation: Conversation;
  route: number[];
  said: Record<number, Said>;
}

/**
 * Where the beat on screen is.
 *
 * `typing`   they are about to say their opening line; the dots are up.
 * `open`     your turn.
 * `answered` you have spoken and they are about to answer; the dots are up.
 * `replied`  their answer is on screen and the next beat is on its way.
 */
type Phase = "typing" | "open" | "answered" | "replied";

/**
 * How long they take before speaking. Long enough to read as somebody about to
 * answer, short enough that nobody wonders whether anything is coming.
 */
const THINKING = 700;

/**
 * The safety net on any one wait. A clip that never reports finishing must not
 * be able to strand a conversation that has no button in it.
 */
const MAX_WAIT = 9000;

/** Earlier conversations kept on screen. Enough to scroll back through. */
const HELD_LIMIT = 3;

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

/** Where a conversation starts: waiting on them, or straight to you. */
function firstPhase(conversation: Conversation): Phase {
  return conversation.turns[0]?.theirOpener ? "typing" : "open";
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Resolves once the tab is in front of somebody.
 *
 * A conversation that carries on in a background tab has its next line spoken
 * to nobody, and the learner comes back to a beat they never heard open. So it
 * waits where it is, and picks up the moment the tab is looked at again.
 */
function whenVisible(): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState === "hidden") return;
      document.removeEventListener("visibilitychange", onChange);
      resolve();
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

/**
 * Keeps focus in the box when a button beside it is pressed. A tap moves focus
 * to what was tapped, and on a phone focus leaving the box is the keyboard
 * going down, only to come back up for the next line.
 */
function keepFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function prefersLessMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
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
  const tone = registerOf(locale, line.source);

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
        {/* Read off the address pronoun already in the line. Most lines carry
            none and get no tag, which is the point: it marks the sentences
            where the choice was made, not every sentence. */}
        {tone && <span className={`tone tone--${tone}`}>{REGISTER_LABEL[tone]}</span>}
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

/** Their side of the thread, while they are about to say something. */
function Typing({ label }: { label: string }) {
  return (
    <p className="convo-waiting" role="status">
      <span aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">{label}</span>
    </p>
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
        <span>{said.line.source}</span>
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

/**
 * The other things that would have worked here, folded away.
 *
 * Open, this was a dashed box between every answer and the next line, which is
 * the eye leaving the conversation twice a beat. Folded, it is one quiet line
 * for anybody who wants to know what else they could have said.
 */
function AlsoWorks({ turn, said, locale }: { turn: ConvTurn; said: Said; locale: string }) {
  const others = turn.yourLines.filter((line) => line.source !== said.line.source);
  if (others.length === 0) return null;

  return (
    <details className="convo-also">
      <summary>
        {others.length === 1 ? "Another way to say it" : `${others.length} other ways to say it`}
      </summary>
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
    </details>
  );
}

function Beat({
  turn,
  first,
  locale,
  said,
  english,
  active,
  phase,
  openKey,
  onPop,
}: {
  turn: ConvTurn;
  /** The opening beat of a conversation, which always sets its scene. */
  first: boolean;
  locale: string;
  said: Said | undefined;
  english: boolean;
  active: boolean;
  /** Where this beat is. Beats already walked are always fully shown. */
  phase: Phase;
  openKey: string | null;
  onPop: (key: string | null) => void;
}) {
  // The situation is English, so it only appears where nothing else can do its
  // job: a beat you open has no line of theirs to react to, and without the cue
  // there is no way to know what you are meant to want. Where they speak
  // first, their line is the prompt and the cue hides behind the toggle. The
  // one exception is the start of a conversation, where it is the scene change
  // that says you have walked somewhere new.
  const showCue = first || !turn.theirOpener || english;
  const openerOut = phase !== "typing";
  const replyOut = phase === "replied";

  return (
    <li className={`convo-beat${active ? " is-active" : ""}`}>
      {showCue && <p className="convo-situation">{turn.situation}</p>}

      {turn.theirOpener &&
        (openerOut ? (
          <Bubble
            line={turn.theirOpener}
            side="them"
            locale={locale}
            english={english}
            openKey={openKey}
            popKey={`${turn.id}-them`}
            onPop={onPop}
          />
        ) : (
          <Typing label="They're about to say something" />
        ))}

      {said && (
        <>
          {/* What you actually said goes in your bubble, right or wrong. The
              full line sits under it where you said a shorter version of it,
              and the correction where you said something else: replacing your
              own half of the transcript with the authored line would quietly
              rewrite what happened. */}
          {said.typed === null ? null : (
            <div className={`convo-bubble convo-bubble--you${said.correct ? "" : " is-wrong"}`}>
              <p className="convo-source">{said.typed}</p>
            </div>
          )}

          {said.correct && said.typed !== null && !saidItInFull(said) && (
            <p className="convo-full">
              <span className="convo-full-label">in full</span>
              <span>{said.line.source}</span>
              <AudioButton
                locale={locale}
                audioId={said.line.audioId}
                text={said.line.source}
                surface="practice"
              />
            </p>
          )}

          {!said.correct && <Correction said={said} locale={locale} />}

          <AlsoWorks turn={turn} said={said} locale={locale} />

          {turn.theirReply &&
            (replyOut ? (
              <Bubble
                line={turn.theirReply}
                side="them"
                locale={locale}
                english={english}
                openKey={openKey}
                popKey={`${turn.id}-reply`}
                onPop={onPop}
              />
            ) : (
              <Typing label="They're answering" />
            ))}

          {english && replyOut && turn.note && <p className="convo-note">{turn.note}</p>}
        </>
      )}
    </li>
  );
}

/** One conversation's worth of transcript: its beats in the order walked. */
function Transcript({
  conversation,
  route,
  said,
  locale,
  english,
  openKey,
  onPop,
  step,
  phase,
  live,
}: {
  conversation: Conversation;
  route: number[];
  said: Record<number, Said>;
  locale: string;
  english: boolean;
  openKey: string | null;
  onPop: (key: string | null) => void;
  /** The beat on screen, for the conversation being held now. */
  step: number | null;
  phase: Phase;
  live: boolean;
}) {
  return (
    <ol className="convo-transcript" aria-live={live ? "polite" : undefined}>
      {route.map((index, position) => {
        const turn = conversation.turns[index];
        if (!turn) return null;
        const current = index === step;
        return (
          <Beat
            key={turn.id}
            turn={turn}
            first={position === 0}
            locale={locale}
            said={said[index]}
            english={english}
            active={current}
            phase={current ? phase : "replied"}
            openKey={openKey}
            onPop={onPop}
          />
        );
      })}
    </ol>
  );
}

/** Where the thread moves from one conversation into the next. */
function SceneBreak({ conversation, samePlace }: { conversation: Conversation; samePlace: boolean }) {
  return (
    <p className="convo-scene">
      <span className="convo-scene-label">{samePlace ? "Then" : "Somewhere new"}</span>
      <span className="convo-scene-title">
        {samePlace ? conversation.title : placeName(conversation.categoryTitle)}
      </span>
    </p>
  );
}

export default function ConversationMode({
  conversation,
  locale,
  following,
  onBack,
  onFinish,
  onContinue,
}: Props) {
  const turns = conversation.turns;

  /** The beats walked so far, in order. Branching makes this not 0,1,2,3. */
  const [route, setRoute] = useState<number[]>([0]);
  /** Beats stepped over because of what was said. Only used for the count. */
  const [skipped, setSkipped] = useState<number[]>([]);
  const [said, setSaid] = useState<Record<number, Said>>({});
  const [phase, setPhase] = useState<Phase>(firstPhase(conversation));
  const [typed, setTyped] = useState("");
  const [english, setEnglish] = useState(false);
  const [done, setDone] = useState(false);
  /** Whether the English of the line has been asked for on this beat. */
  const [hinted, setHinted] = useState(false);
  /** Which line is showing its meaning. One at a time. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  /** Conversations already held in this sitting, oldest first. */
  const [held, setHeld] = useState<Held[]>([]);

  /**
   * A new conversation is a new transcript, cleared while rendering rather
   * than in an effect. An effect runs after the frame is painted, and carrying
   * on from one conversation into the next painted one frame of the new
   * conversation's beats with the old one's answers against them.
   */
  const [shownId, setShownId] = useState(conversation.id);
  if (shownId !== conversation.id) {
    setShownId(conversation.id);
    clearTranscript();
  }

  const step = route[route.length - 1]!;
  const current = turns[step];
  const settled = said[step] !== undefined;
  const canAnswer = phase === "open" && !settled && !done;

  /**
   * Which walk-through a pending step belongs to. Answering, restarting,
   * leaving or moving on to another conversation starts a new one, and a step
   * still waiting under the old number drops out rather than arriving in the
   * middle of whatever is on screen now.
   */
  const runId = useRef(0);
  /** Set once they have typed or tapped anything, so focus can follow. */
  const engaged = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tail = useRef<HTMLDivElement>(null);

  function speakLine(line: ConvLine): Promise<boolean> {
    return speak(locale, line.audioId, line.source, "practice", { untilDone: true });
  }

  /** Opens a beat: a moment of them about to speak, then their line, out loud. */
  async function openBeat(index: number, run: number) {
    const turn = turns[index];
    setHinted(false);
    if (!turn?.theirOpener) {
      setPhase("open");
      return;
    }
    setPhase("typing");
    await pause(THINKING);
    await whenVisible();
    if (run !== runId.current) return;
    setPhase("open");
    void speakLine(turn.theirOpener);
  }

  function clearTranscript() {
    setRoute([0]);
    setSkipped([]);
    setSaid({});
    setTyped("");
    setDone(false);
    setOpenKey(null);
    setHinted(false);
    setPhase(firstPhase(conversation));
  }

  function restart() {
    const run = ++runId.current;
    stopSpeaking();
    clearTranscript();
    void openBeat(0, run);
  }

  // Opening the first beat, for each new conversation. Leaving abandons
  // anything that was still waiting its turn, and anything still being said.
  // `openBeat` reads the conversation it was rendered with, which is this one.
  useEffect(() => {
    const run = ++runId.current;
    void openBeat(0, run);
    // The lines this conversation says without being asked, fetched now so
    // each one starts on cue rather than after a download on a slow phone.
    void prefetchClips(
      locale,
      turns.flatMap((turn) => [
        turn.theirOpener?.audioId ?? null,
        turn.yourLines[0]?.audioId ?? null,
        turn.theirReply?.audioId ?? null,
      ])
    );
    return () => {
      runId.current++;
      stopSpeaking();
    };
  }, [conversation.id]);

  // The newest thing said is the thing on screen. Not on the very first line,
  // though: the page has only just opened, and the top of it is where you are.
  const opening = route.length === 1 && !settled && held.length === 0;
  useEffect(() => {
    if (opening) return;
    tail.current?.scrollIntoView({
      behavior: prefersLessMotion() ? "auto" : "smooth",
      block: "end",
    });
  }, [route.length, phase, done, held.length, opening, hinted]);

  // Focus follows the conversation, so a second answer needs no second tap.
  // The box itself never unmounts, so on a phone the keyboard stays where it is.
  useEffect(() => {
    if (!canAnswer || !engaged.current) return;
    if (document.activeElement !== inputRef.current) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [canAnswer, step]);

  const correctCount = useMemo(
    () => Object.values(said).filter((s) => s.correct).length,
    [said]
  );

  /** How long this run is: everything except what your answers stepped over. */
  const total = turns.length - skipped.length;

  function settle(verdict: ReplyVerdict, raw: string | null) {
    if (!current) return;
    engaged.current = true;
    const run = ++runId.current;
    const entry: Said = {
      line: verdict.line,
      typed: raw,
      correct: verdict.correct,
      close: verdict.close,
    };
    setSaid((prev) => ({ ...prev, [step]: entry }));
    setTyped("");
    setOpenKey(null);
    setPhase("answered");
    void respond(step, entry, run, skipped.length);
  }

  /**
   * Their answer, then the next beat, without anybody pressing anything.
   *
   * Your own line is spoken back only where there is something to hear in it:
   * the line you were reaching for, or the full version of a short answer.
   * Typing a line correctly and then waiting for a voice to read it back to
   * you was a second of dead air on every beat, in the same voice as the
   * person you were talking to.
   */
  async function respond(from: number, entry: Said, run: number, skipsUsed: number) {
    const turn = turns[from]!;
    const reply = turn.theirReply;
    const alive = () => run === runId.current;

    const worthHearing = !entry.correct || !saidItInFull(entry);
    const yours = worthHearing ? speakLine(entry.line) : Promise.resolve(false);
    await Promise.race([Promise.all([yours, pause(reply ? THINKING : 300)]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    // Enough time to read whatever just appeared: the correction and its
    // English where there was one, and their answer.
    const toRead = readingTime(
      entry.correct ? null : entry.line.source,
      entry.correct ? null : entry.line.en,
      reply?.source
    );

    setPhase("replied");
    const heard = reply ? speakLine(reply) : Promise.resolve(false);
    await Promise.race([Promise.all([heard, pause(toRead)]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    const next = nextBeat(turns, from, intentOf(entry), skipsUsed);
    if (!next) {
      setDone(true);
      onFinish(conversation.id);
      return;
    }
    if (next.skipped.length > 0) setSkipped((prev) => [...prev, ...next.skipped]);
    setRoute((prev) => [...prev, next.index]);
    await openBeat(next.index, run);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    engaged.current = true;
    // Typing ahead while they are still talking is allowed, and what was typed
    // waits in the box for the beat to open rather than being thrown away.
    if (!canAnswer || !typed.trim() || !current) return;
    settle(gradeReply(typed, current.yourLines), typed.trim());
  }

  /** Stuck. Shows the line rather than leaving the conversation nowhere to go. */
  function reveal() {
    if (!canAnswer || !current) return;
    settle({ correct: false, line: current.yourLines[0]!, close: false }, null);
  }

  /** Carry on into what comes next, keeping this conversation above it. */
  function carryOn() {
    if (!following) return;
    setHeld((prev) =>
      [...prev, { conversation, route, said }].slice(-HELD_LIMIT)
    );
    onContinue(following.conversation.id);
  }

  const hint = current ? hintFor(current) : null;
  const toKeep = route
    .map((index) => ({ turn: turns[index], entry: said[index] }))
    .filter((row): row is { turn: ConvTurn; entry: Said } => !!row.turn && !!row.entry && !row.entry.correct);

  // The break above the conversation being held now, when it followed another.
  const previous = held[held.length - 1];
  const samePlace = previous ? previous.conversation.categoryId === conversation.categoryId : false;

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

      {held.map((segment, i) => (
        <div className="convo-held" key={`${segment.conversation.id}-${i}`}>
          {i > 0 && (
            <SceneBreak
              conversation={segment.conversation}
              samePlace={segment.conversation.categoryId === held[i - 1]!.conversation.categoryId}
            />
          )}
          <Transcript
            conversation={segment.conversation}
            route={segment.route}
            said={segment.said}
            locale={locale}
            english={english}
            openKey={openKey}
            onPop={setOpenKey}
            step={null}
            phase="replied"
            live={false}
          />
        </div>
      ))}

      {previous && <SceneBreak conversation={conversation} samePlace={samePlace} />}

      <Transcript
        conversation={conversation}
        route={route}
        said={said}
        locale={locale}
        english={english}
        openKey={openKey}
        onPop={setOpenKey}
        step={done ? null : step}
        phase={phase}
        live
      />

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
          <p className="congrats-title">Conversation held</p>
          <p className="congrats-score">
            {correctCount} / {route.length}
          </p>
          <p className="convo-done-sub">
            {correctCount === route.length
              ? "Every line landed, start to finish."
              : `${route.length} turns held in ${conversation.title.toLowerCase()}.`}{" "}
            Answer differently next time and the conversation takes a different road.
          </p>

          {/* The lines that got away, together, while they are still fresh.
              These are the words this conversation was actually for. */}
          {toKeep.length > 0 && (
            <div className="convo-keep">
              <p className="convo-keep-label">Lines to keep</p>
              <ul>
                {toKeep.map(({ turn, entry }) => (
                  <li key={turn.id}>
                    <span className="convo-keep-line">
                      <span>{entry.line.source}</span>
                      <AudioButton
                        locale={locale}
                        audioId={entry.line.audioId}
                        text={entry.line.source}
                        surface="practice"
                      />
                    </span>
                    {entry.line.en && <span className="convo-keep-en">{entry.line.en}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {following && (
            <button type="button" className="convo-onward" onClick={carryOn}>
              <span className="convo-onward-label">
                {following.samePlace
                  ? "Keep talking"
                  : `Keep going: ${placeName(following.conversation.categoryTitle)}`}
              </span>
              <span className="convo-onward-title">{following.conversation.title}</span>
              {following.conversation.turns[0] && (
                <span className="convo-onward-sub">{following.conversation.turns[0].situation}</span>
              )}
            </button>
          )}

          <div className="controls">
            <button
              type="button"
              className={following ? undefined : "review-primary"}
              onClick={() => {
                setHeld([]);
                restart();
              }}
            >
              Run it again
            </button>
            <button type="button" onClick={onBack}>
              Somewhere else
            </button>
          </div>
        </div>
      ) : (
        // The box you answer in, pinned under the thread. It stays put from the
        // first beat to the last, the way the box in a messaging app does.
        <div className="convo-composer">
          {hinted && hint && canAnswer && (
            <p className="convo-hint">
              <span className="convo-hint-label">You want to say</span>
              {hint}
            </p>
          )}
          <form className="convo-type" onSubmit={submit}>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => {
                engaged.current = true;
                setTyped(e.target.value);
              }}
              placeholder={canAnswer ? "Type what you'd say…" : "They're talking…"}
              aria-label="Your reply, in the language you're learning"
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!canAnswer || !typed.trim()}
              onPointerDown={keepFocus}
            >
              Say it
            </button>
          </form>
          {/* The way out for a beat you have no idea about, in two steps. The
              meaning first, which is usually all that was missing, and the line
              itself only after that. Quieter than the box on purpose: the
              answer is worth having once you have tried, and worth nothing
              before. */}
          <div className="convo-help">
            {canAnswer &&
              (hint && !hinted ? (
                <button
                  type="button"
                  className="convo-stuck"
                  onPointerDown={keepFocus}
                  onClick={() => {
                    engaged.current = true;
                    setHinted(true);
                  }}
                >
                  Stuck? Get a hint
                </button>
              ) : (
                <button
                  type="button"
                  className="convo-stuck"
                  onPointerDown={keepFocus}
                  onClick={() => {
                    engaged.current = true;
                    reveal();
                  }}
                >
                  Show me the line
                </button>
              ))}
          </div>
        </div>
      )}

      <div ref={tail} className="convo-tail" />
    </div>
  );
}
