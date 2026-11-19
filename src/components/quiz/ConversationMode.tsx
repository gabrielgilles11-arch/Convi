import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  gradeReply,
  hasSlot,
  hintFor,
  readingTime,
  type Conversation,
  type ConvLine,
  type ConvTurn,
  type FollowingConversation,
  type ReplyVerdict,
} from "../../lib/conversationTypes";
import AudioButton from "./AudioButton";
import { placeName } from "./ConversationPicker";
import { prefetchClips, speak, stopSpeaking } from "./speech";
import { registerOf, REGISTER_LABEL } from "../../lib/register";
import { LANGUAGE_NAME } from "../../lib/welcome";
import {
  bumpTalkCount,
  FAST_RATE,
  huhDue,
  huhPlan,
  SLOW_RATE,
  type HuhPlan,
  type RepairKit,
} from "../../lib/repairTypes";

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
 * Every conversation is a script (lib/talkScripts.ts): it opens on the point
 * of the moment, they answer what you actually said, and it ends there. Where
 * a farewell belongs the local says it (`outros`), so you are never made to
 * type a goodbye just to finish.
 * Where what you say changes what happens, it does: order a caña and the
 * bartender asks if you want something to eat, order "una cerveza" and he
 * asks draft or bottle. Every line on every path is a sourced content line.
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
  /** The lines a "Huh?" moment is made of. Null: no moment, ever. */
  repair: RepairKit | null;
}

/** What was actually said on a beat, once it is settled. */
interface Said {
  /** The authored line it counts as. */
  line: ConvLine;
  /** Which of the beat's lines that is, which decides what comes back. */
  index: number;
  /** What they typed, where they typed something. Null if they asked to see it. */
  typed: string | null;
  correct: boolean;
  close: boolean;
  /**
   * The line as it is written, under a correct answer that was not it to the
   * letter: their short version, a missing accent, a blank said without its
   * frame. Null when they said it exactly, or got it wrong.
   */
  recommended: ConvLine | null;
}

/** A conversation already held in this sitting, kept above the current one. */
interface Held {
  conversation: Conversation;
  route: number[];
  said: Record<number, Said>;
  huh: Huh | null;
}

/**
 * A "Huh?" moment, as it played out on its beat.
 *
 * Their line goes by too fast to catch and you have to ask for it again, in
 * the language, the way it actually goes at a bar. In Sweden the local's first
 * instinct is to switch to English instead, so there you steer them back
 * before they repeat it. Then they say it again, slowly, and the beat carries
 * on as any other.
 *
 * `missed`    their line went by too fast; your turn to ask.
 * `offered`   (Sweden) they offered English; your turn to steer back.
 * `waiting`   they are about to answer; the dots are up.
 * `repeated`  they said it again, slowly. The beat is an ordinary one now.
 */
interface Huh {
  step: number;
  stage: "missed" | "offered" | "waiting" | "repeated";
  ask: Said | null;
  steer: Said | null;
  /** What they said back during the moment, in order. */
  theirs: ConvLine[];
}

/** Their line, too fast to catch: blurred, with a way to hear it go by again. */
function MissedBubble({ line, locale }: { line: ConvLine; locale: string }) {
  return (
    <div className="convo-bubble convo-bubble--them convo-missed">
      <p className="convo-source">
        <span className="convo-blur" aria-hidden="true">
          {line.source}
        </span>
        <span className="sr-only">Something said too fast to catch.</span>
        <button
          type="button"
          className="convo-replay"
          onClick={() =>
            void speak(locale, line.audioId, line.source, "practice", { rate: FAST_RATE })
          }
        >
          Hear it again
        </button>
      </p>
      <p className="convo-missed-label">Too fast to catch</p>
    </div>
  );
}

/** Your side of a "Huh?" moment: what you said, and the line where it missed. */
function HuhYours({ said, locale }: { said: Said; locale: string }) {
  return (
    <>
      {said.typed !== null && (
        <div className={`convo-bubble convo-bubble--you${said.correct ? "" : " is-wrong"}`}>
          <p className="convo-source">{said.typed}</p>
        </div>
      )}
      {said.correct && said.typed !== null && said.recommended && (
        <Recommended line={said.recommended} locale={locale} />
      )}
      {!said.correct && <Correction said={said} locale={locale} />}
    </>
  );
}

/**
 * Under a right answer that was not the line to the letter: the line as a
 * local would say it. Right is right, and they still see the accent they left
 * off, the rest of the order they shortened, or their own word back in the
 * frame it goes in.
 */
function Recommended({ line, locale }: { line: ConvLine; locale: string }) {
  return (
    <p className="convo-full">
      <span className="convo-full-label">Recommended</span>
      <span>{line.source}</span>
      <AudioButton locale={locale} audioId={line.audioId} text={line.source} surface="practice" />
    </p>
  );
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
 * Their closing line on the last beat: not due yet, about to be said (the
 * dots), or said. Beats already behind you always show theirs.
 */
type OutroState = "none" | "typing" | "out";

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
  intro,
  howTo,
  locale,
  said,
  english,
  active,
  phase,
  outroState,
  openKey,
  onPop,
  huh,
}: {
  turn: ConvTurn;
  /** The "Huh?" moment on this beat, where there is one. */
  huh: Huh | null;
  /** The opening beat of a conversation, which always sets its scene. */
  first: boolean;
  /** Where you are, said once above the first line. */
  intro: string;
  /** How Talk works, in one line, until the first answer is in. */
  howTo: string | null;
  locale: string;
  said: Said | undefined;
  english: boolean;
  active: boolean;
  /** Where this beat is. Beats already walked are always fully shown. */
  phase: Phase;
  /** Their closing line, on the beat that ends the conversation. */
  outroState: OutroState;
  openKey: string | null;
  onPop: (key: string | null) => void;
}) {
  // English on screen is kept to what nothing else can say. The scene, once,
  // at the top. A cue where you have to start and nothing they said tells you
  // what about. Everything else is the conversation, and with Show English on,
  // what each moment is.
  const cue = turn.cue ?? (english && !first ? turn.situation : null);
  const openerOut = phase !== "typing";
  const replyOut = phase === "replied";
  const reply = said ? (turn.replies[said.index] ?? null) : null;
  const outro = said ? (turn.outros[said.index] ?? null) : null;

  return (
    <li className={`convo-beat${active ? " is-active" : ""}`}>
      {first && <p className="convo-situation convo-intro">{intro}</p>}
      {first && howTo && <p className="convo-howto">{howTo}</p>}
      {cue && <p className="convo-situation">{cue}</p>}

      {turn.theirOpener && huh && (
        <>
          {openerOut ? (
            <MissedBubble line={turn.theirOpener} locale={locale} />
          ) : (
            <Typing label="They're about to say something" />
          )}
          {huh.ask && <HuhYours said={huh.ask} locale={locale} />}
          {huh.theirs[0] && (
            <Bubble
              line={huh.theirs[0]}
              side="them"
              locale={locale}
              english={english}
              openKey={openKey}
              popKey={`${turn.id}-huh-0`}
              onPop={onPop}
            />
          )}
          {huh.steer && <HuhYours said={huh.steer} locale={locale} />}
          {huh.theirs[1] && (
            <Bubble
              line={huh.theirs[1]}
              side="them"
              locale={locale}
              english={english}
              openKey={openKey}
              popKey={`${turn.id}-huh-1`}
              onPop={onPop}
            />
          )}
          {huh.stage === "waiting" && <Typing label="They're answering" />}
          {huh.stage === "repeated" && (
            <>
              <p className="convo-slower">Again, slower:</p>
              <Bubble
                line={turn.theirOpener}
                side="them"
                locale={locale}
                english={english}
                openKey={openKey}
                popKey={`${turn.id}-them`}
                onPop={onPop}
              />
            </>
          )}
        </>
      )}

      {turn.theirOpener &&
        !huh &&
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

          {said.correct && said.typed !== null && said.recommended && (
            <Recommended line={said.recommended} locale={locale} />
          )}

          {!said.correct && <Correction said={said} locale={locale} />}

          {english && <AlsoWorks turn={turn} said={said} locale={locale} />}

          {reply &&
            (replyOut ? (
              <Bubble
                line={reply}
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

          {outro &&
            replyOut &&
            outroState !== "none" &&
            (outroState === "out" ? (
              <Bubble
                line={outro}
                side="them"
                locale={locale}
                english={english}
                openKey={openKey}
                popKey={`${turn.id}-outro`}
                onPop={onPop}
              />
            ) : (
              <Typing label="They're wrapping up" />
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
  outroState,
  howTo,
  live,
  huh,
}: {
  conversation: Conversation;
  route: number[];
  said: Record<number, Said>;
  /** The "Huh?" moment in this conversation, where it had one. */
  huh: Huh | null;
  locale: string;
  english: boolean;
  openKey: string | null;
  onPop: (key: string | null) => void;
  /** The beat on screen, for the conversation being held now. */
  step: number | null;
  phase: Phase;
  /** The closing line's state on the beat on screen. */
  outroState: OutroState;
  /** The how-it-works line for the first beat, or null. */
  howTo: string | null;
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
            intro={conversation.intro}
            howTo={position === 0 ? howTo : null}
            locale={locale}
            said={said[index]}
            english={english}
            active={current}
            phase={current ? phase : "replied"}
            outroState={current ? outroState : "out"}
            openKey={openKey}
            onPop={onPop}
            huh={huh && huh.step === index ? huh : null}
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
  repair,
}: Props) {
  const turns = conversation.turns;

  /** The beats walked so far, in order. Branching makes this not 0,1,2,3. */
  const [route, setRoute] = useState<number[]>([0]);
  const [said, setSaid] = useState<Record<number, Said>>({});
  const [phase, setPhase] = useState<Phase>(firstPhase(conversation));
  const [outroState, setOutroState] = useState<OutroState>("none");
  const [typed, setTyped] = useState("");
  const [english, setEnglish] = useState(false);
  const [done, setDone] = useState(false);
  /** Whether the English of the line has been asked for on this beat. */
  const [hinted, setHinted] = useState(false);
  /** Which line is showing its meaning. One at a time. */
  const [openKey, setOpenKey] = useState<string | null>(null);
  /** Conversations already held in this sitting, oldest first. */
  const [held, setHeld] = useState<Held[]>([]);
  /** This conversation's "Huh?" moment, once it has started. */
  const [huh, setHuh] = useState<Huh | null>(null);
  /** Where this run's moment is due, if it has one at all. */
  const huhAt = useRef<HuhPlan | null>(null);
  /** Beats walked so far on which they spoke first, for an `nth` plan. */
  const theirBeats = useRef(0);

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
  /** Your turn inside a "Huh?" moment: asking again, or steering back. */
  const huhTurn =
    huh && huh.step === step && (huh.stage === "missed" || huh.stage === "offered") ? huh.stage : null;
  /** The lines that count on this turn of the moment. */
  const huhLines = huhTurn === "missed" ? repair?.asks : huhTurn === "offered" ? repair?.english?.steer : null;

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

  /** Whether the moment lands on this beat, counting it if they speak first. */
  function huhLandsOn(index: number): boolean {
    const plan = huhAt.current;
    if (!plan || !repair || !turns[index]?.theirOpener) return false;
    theirBeats.current += 1;
    const lands = "at" in plan ? plan.at === index : plan.nth === theirBeats.current;
    if (lands) huhAt.current = null; // once per run
    return lands;
  }

  /** Opens a beat: a moment of them about to speak, then their line, out loud. */
  async function openBeat(index: number, run: number) {
    const turn = turns[index];
    setHinted(false);
    if (!turn?.theirOpener) {
      setPhase("open");
      return;
    }
    const missed = huhLandsOn(index);
    setPhase("typing");
    await pause(THINKING);
    await whenVisible();
    if (run !== runId.current) return;
    if (missed) {
      // Too fast to catch. Their line plays quick and stays blurred, and the
      // box waits for you to ask for it again.
      setHuh({ step: index, stage: "missed", ask: null, steer: null, theirs: [] });
      setPhase("open");
      void speak(locale, turn.theirOpener.audioId, turn.theirOpener.source, "practice", {
        rate: FAST_RATE,
      });
      return;
    }
    setPhase("open");
    void speakLine(turn.theirOpener);
  }

  /** Settles your turn inside the moment: the ask, or (Sweden) the steer. */
  function settleHuh(verdict: ReplyVerdict, raw: string | null) {
    if (!huh || !huhTurn || !repair) return;
    engaged.current = true;
    const run = ++runId.current;
    const entry: Said = {
      line: verdict.line,
      index: 0,
      typed: raw,
      correct: verdict.correct,
      close: verdict.close,
      recommended: verdict.recommended,
    };
    const from = huhTurn;
    setHuh((h) => (h ? { ...h, stage: "waiting", ...(from === "missed" ? { ask: entry } : { steer: entry }) } : h));
    setTyped("");
    setOpenKey(null);
    setPhase("answered");
    void huhRespond(from, entry, run);
  }

  /**
   * Their side of the moment. In Sweden, the first ask gets English offered
   * back and waits for you to steer; everywhere else, and after the steer,
   * they say they'll repeat it, then repeat it slowly, and the beat opens.
   */
  async function huhRespond(from: "missed" | "offered", entry: Said, run: number) {
    if (!repair) return;
    const alive = () => run === runId.current;
    const yours = entry.correct ? Promise.resolve(false) : speakLine(entry.line);
    await Promise.race([Promise.all([yours, pause(THINKING)]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    if (from === "missed" && repair.english) {
      const offer = repair.english.offer;
      setHuh((h) => (h ? { ...h, stage: "offered", theirs: [offer] } : h));
      setPhase("open");
      void speakLine(offer);
      return;
    }

    const back = from === "offered" && repair.english ? repair.english.agree : repair.back;
    setHuh((h) => (h ? { ...h, theirs: [...h.theirs, back] } : h));
    const heard = speakLine(back);
    await Promise.race([Promise.all([heard, pause(readingTime(back.source))]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    const opener = turns[step]?.theirOpener;
    setHuh((h) => (h ? { ...h, stage: "repeated" } : h));
    setPhase("open");
    if (opener) {
      void speak(locale, opener.audioId, opener.source, "practice", { rate: SLOW_RATE });
    }
  }

  function clearTranscript() {
    setHuh(null);
    theirBeats.current = 0;
    setRoute([0]);
    setSaid({});
    setTyped("");
    setDone(false);
    setOpenKey(null);
    setHinted(false);
    setOutroState("none");
    setPhase(firstPhase(conversation));
  }

  function restart() {
    const run = ++runId.current;
    stopSpeaking();
    clearTranscript();
    // Running it again is not a new conversation started, so it does not
    // count toward the every-third moment. A wired one still has its moment.
    huhAt.current = repair && conversation.huhAt !== null ? huhPlan(conversation) : null;
    void openBeat(0, run);
  }

  // Opening the first beat, for each new conversation. Leaving abandons
  // anything that was still waiting its turn, and anything still being said.
  // `openBeat` reads the conversation it was rendered with, which is this one.
  useEffect(() => {
    const run = ++runId.current;
    // Every conversation started counts, and every third gets a "Huh?" moment
    // somewhere in it; the wired ones always do. Decided before the first beat
    // opens, since the first beat can be where it lands.
    huhAt.current = repair && huhDue(conversation, bumpTalkCount()) ? huhPlan(conversation) : null;
    theirBeats.current = 0;
    void openBeat(0, run);
    // The lines this conversation says without being asked, fetched now so
    // each one starts on cue rather than after a download on a slow phone.
    void prefetchClips(
      locale,
      turns.flatMap((turn) => [
        turn.theirOpener?.audioId ?? null,
        turn.yourLines[0]?.audioId ?? null,
        ...turn.replies.map((reply) => reply?.audioId ?? null),
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

  function settle(verdict: ReplyVerdict, raw: string | null) {
    if (!current) return;
    engaged.current = true;
    const run = ++runId.current;
    const index = Math.max(0, current.yourLines.indexOf(verdict.line));
    const entry: Said = {
      line: verdict.line,
      index,
      typed: raw,
      correct: verdict.correct,
      close: verdict.close,
      recommended: verdict.recommended,
    };
    setSaid((prev) => ({ ...prev, [step]: entry }));
    setTyped("");
    setOpenKey(null);
    setPhase("answered");
    void respond(step, entry, run);
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
  async function respond(from: number, entry: Said, run: number) {
    const turn = turns[from]!;
    const reply = turn.replies[entry.index] ?? null;
    const alive = () => run === runId.current;

    // A correct answer is spoken back only as the recommended line, where it
    // differs from what they typed; a wrong one, as the line it should have been.
    const spoken = entry.correct ? entry.recommended : entry.line;
    const yours = spoken ? speakLine(spoken) : Promise.resolve(false);
    await Promise.race([Promise.all([yours, pause(reply ? THINKING : 300)]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    // Enough time to read whatever just appeared: the correction and its
    // English where there was one, and their answer.
    const toRead = readingTime(
      entry.correct ? entry.recommended?.source : entry.line.source,
      entry.correct ? null : entry.line.en,
      reply?.source
    );

    setPhase("replied");
    const heard = reply ? speakLine(reply) : Promise.resolve(false);
    await Promise.race([Promise.all([heard, pause(toRead)]), pause(MAX_WAIT)]);
    await whenVisible();
    if (!alive()) return;

    // Where the script goes from the line you said. A wrong answer counts as
    // the line it was corrected to, so a miss never strands the conversation.
    const next = turn.next[entry.index] ?? null;
    if (next === null) {
      // The local closes the scene, where the script has them do it: a beat,
      // the dots, then their "Hasta luego" out loud, and only then the end.
      const outro = turn.outros[entry.index] ?? null;
      if (outro) {
        setOutroState("typing");
        await pause(THINKING);
        await whenVisible();
        if (!alive()) return;
        setOutroState("out");
        const closing = speakLine(outro);
        await Promise.race([Promise.all([closing, pause(readingTime(outro.source))]), pause(MAX_WAIT)]);
        await whenVisible();
        if (!alive()) return;
      }
      setDone(true);
      onFinish(conversation.id);
      return;
    }
    setRoute((prev) => [...prev, next]);
    await openBeat(next, run);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    engaged.current = true;
    // Typing ahead while they are still talking is allowed, and what was typed
    // waits in the box for the beat to open rather than being thrown away.
    if (!canAnswer || !typed.trim() || !current) return;
    if (huhLines?.length) {
      settleHuh(gradeReply(typed, huhLines), typed.trim());
      return;
    }
    settle(gradeReply(typed, current.yourLines), typed.trim());
  }

  /** Stuck. Shows the line rather than leaving the conversation nowhere to go. */
  function reveal() {
    if (!canAnswer || !current) return;
    if (huhLines?.length) {
      settleHuh({ correct: false, line: huhLines[0]!, close: false, recommended: null }, null);
      return;
    }
    settle({ correct: false, line: current.yourLines[0]!, close: false, recommended: null }, null);
  }

  /** Carry on into what comes next, keeping this conversation above it. */
  function carryOn() {
    if (!following) return;
    setHeld((prev) =>
      [...prev, { conversation, route, said, huh }].slice(-HELD_LIMIT)
    );
    onContinue(following.conversation.id);
  }

  // Inside the moment the hint is what asking again means, in English.
  const huhHint = huhLines?.map((l) => l.en?.trim() ?? "").filter(Boolean) ?? [];
  const hint = huhLines?.length
    ? huhHint.length
      ? huhHint
      : null
    : current
      ? hintFor(current)
      : null;
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
            huh={segment.huh}
            locale={locale}
            english={english}
            openKey={openKey}
            onPop={setOpenKey}
            step={null}
            phase="replied"
            outroState="out"
            howTo={null}
            live={false}
          />
        </div>
      ))}

      {previous && <SceneBreak conversation={conversation} samePlace={samePlace} />}

      <Transcript
        conversation={conversation}
        route={route}
        said={said}
        huh={huh}
        locale={locale}
        english={english}
        openKey={openKey}
        onPop={setOpenKey}
        step={done ? null : step}
        phase={phase}
        outroState={outroState}
        howTo={
          held.length === 0 && route.length === 1 && !settled
            ? `They talk, you answer in ${LANGUAGE_NAME[locale] ?? "the language"}: type it in the box below. Stuck? Tap "Get a hint".`
            : null
        }
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
              : `${correctCount} of ${route.length} lines said on your own, without the line shown.`}{" "}
            {conversation.branches &&
              "Say something different next time and it goes a different way."}
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
              <span className="convo-onward-sub">{following.conversation.intro}</span>
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
              <span className="convo-hint-label">
                {hint.length > 1 ? "You could say" : "You want to say"}
              </span>
              {hint.map((option, i) => (
                <span key={option} className="convo-hint-option">
                  {i > 0 && <span className="convo-hint-or">or</span>}
                  {option}
                </span>
              ))}
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
              placeholder={
                !canAnswer
                  ? "They're talking…"
                  : huhTurn === "missed"
                    ? "Missed it? Ask again…"
                    : huhTurn === "offered"
                      ? `Keep it in ${LANGUAGE_NAME[locale] ?? "the language"}…`
                      : "Type what you'd say…"
              }
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
