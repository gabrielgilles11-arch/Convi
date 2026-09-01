import { useEffect, useState } from "react";

/**
 * The first thing a new buyer sees.
 *
 * Two title cards, then the taster. It is a sales moment as much as an
 * onboarding one — somebody has just paid, and this is where they find out
 * what they bought — so the lines arrive one at a time rather than landing as
 * a wall of text, and the whole card is the button: there is nothing to hunt
 * for and nothing to read twice.
 */

interface Props {
  /** Advance out of the welcome cards and into the six questions. */
  onStart: () => void;
  /** Leave the intro entirely — for anyone who has seen it before. */
  onSkip: () => void;
}

/** Each card's lines, in the order they fade in. */
const CARDS: { lines: string[]; cue: string }[] = [
  {
    lines: [
      "Welcome to Try Convi",
      "Where I teach you how to speak like a local",
      "And make travel easy",
    ],
    cue: "Tap to continue",
  },
  {
    lines: ["Here are some of the questions you will face ahead"],
    cue: "Tap to begin",
  },
];

/** Milliseconds between one line appearing and the next. */
const LINE_DELAY = 900;

/** Milliseconds between one letter appearing and the next within a line. */
const CHAR_DELAY = 22;

function fadingLetters(line: string) {
  let index = 0;
  const words = line.split(" ");

  return words.map((word, w) => {
    const letters = [...word].map((char) => (
      <span
        key={index}
        className="welcome-char"
        style={{ animationDelay: `${index++ * CHAR_DELAY}ms` }}
      >
        {char}
      </span>
    ));
    // The space rides outside the word, so that is where the line may break.
    index += 1;
    return (
      <span key={`w${w}`}>
        <span className="welcome-word">{letters}</span>
        {w < words.length - 1 ? " " : null}
      </span>
    );
  });
}

export default function Welcome({ onStart, onSkip }: Props) {
  const [card, setCard] = useState(0);
  /** How many of this card's lines have arrived. */
  const [shown, setShown] = useState(0);

  const lines = CARDS[card].lines;

  useEffect(() => {
    setShown(0);
    const timers = lines.map((_, i) =>
      window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), LINE_DELAY * i + 250)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [card, lines]);

  function advance() {
    // A tap before the lines have finished arriving shows the rest of them
    // rather than skipping the card — impatience shouldn't cost you the words.
    if (shown < lines.length) {
      setShown(lines.length);
      return;
    }
    if (card + 1 < CARDS.length) setCard(card + 1);
    else onStart();
  }

  const ready = shown >= lines.length;

  return (
    <div
      className="welcome"
      role="button"
      tabIndex={0}
      onClick={advance}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          advance();
        }
      }}
    >
      <div className="welcome-card">
        {lines.map((line, i) => (
          <p
            key={line}
            className={`welcome-line${i === 0 ? " lead" : ""}${i < shown ? " in" : ""}`}
          >
            {/* Split so the letters arrive rather than the line. Grouped by
                word, because a letter is an inline-block and the browser will
                happily break the line between two of them — "Welcome to Try
                Conv / i". The string is also in the DOM once, unsplit, for
                screen readers: the animation is decoration. */}
            <span aria-hidden="true">{fadingLetters(line)}</span>
            <span className="sr-only">{line}</span>
          </p>
        ))}

        <p className={`welcome-cue${ready ? " in" : ""}`}>{CARDS[card].cue}</p>
      </div>

      <button
        type="button"
        className="welcome-skip"
        onClick={(event) => {
          event.stopPropagation();
          onSkip();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
