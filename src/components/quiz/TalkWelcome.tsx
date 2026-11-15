import { useEffect, useRef } from "react";
import { LANGUAGE_NAME } from "../../lib/welcome";
import ConviGuide from "./ConviGuide";

/**
 * The first time somebody opens Talk Mode for a language.
 *
 * Convi says what Talk is in two lines, and the button goes straight into the
 * one conversation every trip starts with: ordering a drink at the bar. The
 * list of everything else is one tap away for anybody who would rather pick.
 */
interface Props {
  locale: string;
  /** False while the conversations are still loading. */
  ready: boolean;
  onStart: () => void;
  onBrowse: () => void;
  onBack: () => void;
}

/** What the first conversation is, said the way each edition orders. */
const FIRST_DRINK: Record<string, string> = {
  "es-ES": "a caña at a bar in Madrid",
  "sv-SE": "a beer at a bar in Stockholm",
  "de-DE": "a beer in a Munich beer hall",
};

export default function TalkWelcome({ locale, ready, onStart, onBrowse, onBack }: Props) {
  const language = LANGUAGE_NAME[locale] ?? "the language";
  const start = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ready) start.current?.focus({ preventScroll: true });
  }, [ready]);

  return (
    <div className="welcome welcome--talk">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          Back to path
        </button>
        <span>Talk Mode</span>
      </p>
      <ConviGuide>
        <p className="convi-bubble-title">Welcome to Talk Mode!</p>
        <p>This is where you talk like a local. They speak {language}, you answer in {language}.</p>
      </ConviGuide>
      <ol className="welcome-steps">
        <li>Read or listen to what they say.</li>
        <li>Type your reply in {language}. Short is fine, the way you'd really say it.</li>
        <li>Stuck? Tap for a hint, then for the line itself.</li>
      </ol>
      <p className="welcome-sub">First up: ordering {FIRST_DRINK[locale] ?? "a beer"}, like a local.</p>
      <div className="welcome-actions">
        <button
          ref={start}
          type="button"
          className="welcome-primary"
          onClick={onStart}
          disabled={!ready}
        >
          {ready ? "Order my first drink" : "Loading..."}
        </button>
        <button type="button" className="welcome-skip" onClick={onBrowse} disabled={!ready}>
          See all conversations
        </button>
      </div>
    </div>
  );
}
