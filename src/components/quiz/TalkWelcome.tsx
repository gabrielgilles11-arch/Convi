import { useEffect, useRef } from "react";
import { LANGUAGE_NAME, WELCOME_HELLO, WELCOME_PROMISE } from "../../lib/welcome";
import ConviGuide from "./ConviGuide";

/**
 * The first time somebody opens Talk Mode for a language.
 *
 * Convi types his hello in the language you picked, says what he is for, and
 * says what is first: ordering a drink at the bar. The button goes straight
 * into that conversation; the list of everything else is one tap away for
 * anybody who would rather pick.
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
  const hello = WELCOME_HELLO[locale] ?? { text: "Welcome to Try Convi!", lang: "en" };
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
      <ConviGuide
        lines={[
          { text: hello.text, lang: hello.lang, className: "convi-line--hello" },
          { text: WELCOME_PROMISE },
          {
            text: `Let's start your first Talk Mode conversation: ordering ${FIRST_DRINK[locale] ?? "a beer"}.`,
            className: "convi-line--lead",
          },
        ]}
      />
      <p className="welcome-sub">
        They talk, you type your reply in {language}. Short is fine, the way you'd really say it. Stuck? Tap
        for a hint.
      </p>
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
