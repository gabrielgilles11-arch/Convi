import { useEffect, useRef, useState } from "react";
import type { Conversation, ConvLine, ConvTurn } from "../../lib/conversationTypes";
import AudioButton from "./AudioButton";
import { stopSpeaking } from "./speech";

/**
 * Walking one conversation, beat by beat.
 *
 * Not a test: there is no score, no wrong answer and nothing sent back around.
 * Where a beat offers two lines they are both right and differ in register, so
 * choosing is choosing how to sound, not guessing. That is what the content
 * supports — every line authored, none generated — and the screen says so
 * rather than dressing a fixed script up as a conversation that reacts.
 *
 * The transcript is derived, never accumulated: `step` is the beat you are on
 * and `picked` is what you said on each beat before it, so re-rendering can
 * never drift from what is on screen, and "start over" is two resets.
 */
interface Props {
  conversation: Conversation;
  locale: string;
  onBack: () => void;
  /** Called the first time the last beat is reached. */
  onFinish: (id: string) => void;
}

/** Their line, on the left. */
function TheirBubble({ line, locale }: { line: ConvLine; locale: string }) {
  return (
    <div className="convo-bubble convo-bubble--them">
      <p className="convo-source">
        {line.source}
        <AudioButton locale={locale} audioId={line.audioId} text={line.source} surface="practice" />
      </p>
      {line.en && <p className="convo-en">{line.en}</p>}
    </div>
  );
}

/** Your line, on the right, once you've said it. */
function YourBubble({ line, locale }: { line: ConvLine; locale: string }) {
  return (
    <div className="convo-bubble convo-bubble--you">
      <p className="convo-source">
        {line.source}
        <AudioButton locale={locale} audioId={line.audioId} text={line.source} surface="practice" />
      </p>
      {line.en && <p className="convo-en">{line.en}</p>}
    </div>
  );
}

function Beat({
  turn,
  index,
  locale,
  pickedIndex,
  onPick,
  active,
}: {
  turn: ConvTurn;
  index: number;
  locale: string;
  pickedIndex: number | null;
  onPick: (option: number) => void;
  active: boolean;
}) {
  const spoken = pickedIndex !== null;

  return (
    <li className={`convo-beat${active ? " is-active" : ""}`}>
      <p className="convo-situation">
        <span className="convo-beat-n" aria-hidden="true">
          {index + 1}
        </span>
        {turn.situation}
      </p>

      {turn.theirOpener && <TheirBubble line={turn.theirOpener} locale={locale} />}

      {spoken ? (
        <>
          <YourBubble line={turn.yourLines[pickedIndex]!} locale={locale} />
          {/* The lines you passed over stay reachable but quiet: on a beat with
              a polite option and a blunt one, the one you didn't take is half of
              what the beat teaches. */}
          {turn.yourLines.length > 1 && (
            <details className="convo-alts">
              <summary>You could also have said</summary>
              <ul>
                {turn.yourLines.map((line, i) =>
                  i === pickedIndex ? null : (
                    <li key={i}>
                      <span className="convo-alt-source">{line.source}</span>
                      {line.en && <span className="convo-alt-en">{line.en}</span>}
                      <AudioButton
                        locale={locale}
                        audioId={line.audioId}
                        text={line.source}
                        surface="practice"
                      />
                    </li>
                  )
                )}
              </ul>
            </details>
          )}
          {turn.theirReply && <TheirBubble line={turn.theirReply} locale={locale} />}
          {turn.note && <p className="convo-note">{turn.note}</p>}
        </>
      ) : (
        <div className="convo-choices">
          <p className="convo-choices-label">
            {turn.yourLines.length > 1 ? "Say one of these" : "Say this"}
          </p>
          {turn.yourLines.map((line, i) => (
            <button type="button" className="convo-choice" key={i} onClick={() => onPick(i)}>
              <span className="convo-choice-source">{line.source}</span>
              {line.en && <span className="convo-choice-en">{line.en}</span>}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export default function ConversationMode({ conversation, locale, onBack, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>(() =>
    conversation.turns.map(() => null)
  );
  const [done, setDone] = useState(false);

  // A new conversation is a new transcript. Without this, opening a second one
  // from the summary screen would keep the first one's choices.
  useEffect(() => {
    setStep(0);
    setPicked(conversation.turns.map(() => null));
    setDone(false);
  }, [conversation.id, conversation.turns]);

  // A line still being read while the next beat opens is worse than not hearing
  // it at all — the same rule the round screens follow.
  useEffect(() => {
    return () => stopSpeaking();
  }, [conversation.id]);

  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Bring the newest beat into view, but never on the first one: scrolling the
    // page the moment a conversation opens hides the heading you just tapped.
    if (step === 0) return;
    tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  const turns = conversation.turns;
  const current = turns[step];
  const spokenHere = step < turns.length && picked[step] !== null;
  const lastBeat = step === turns.length - 1;

  function pick(option: number) {
    setPicked((prev) => {
      const next = [...prev];
      next[step] = option;
      return next;
    });
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
    setPicked(turns.map(() => null));
    setDone(false);
  }

  return (
    <div className="convo-mode">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          All conversations
        </button>
        <span>{conversation.title}</span>
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
            pickedIndex={picked[i] ?? null}
            onPick={pick}
            active={i === step && !done}
          />
        ))}
      </ol>

      <div ref={tail} />

      {done ? (
        <div className="convo-done">
          <p className="convo-done-title">That's the whole conversation.</p>
          <p className="convo-done-sub">
            {turns.length} turns, start to finish. Run it again and take the other
            lines — they're the same moment said a different way.
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
        spokenHere && (
          <div className="controls convo-controls">
            <button type="button" className="review-primary" onClick={advance}>
              {lastBeat ? "Finish" : "Next line"}
            </button>
          </div>
        )
      )}

      {/* Said once, at the bottom, where it answers the question the screen
          raises rather than pre-empting it: the lines don't branch, and the
          reason they don't is that a branch nobody wrote would have to be
          invented. */}
      {!done && current && (
        <p className="convo-footnote">
          Every line here was written for this moment. Picking a different one
          changes how you sound, not what they say next.
        </p>
      )}
    </div>
  );
}
