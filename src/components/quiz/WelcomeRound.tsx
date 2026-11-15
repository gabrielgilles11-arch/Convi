import { useEffect, useMemo, useRef, useState } from "react";
import { buildQuestion, type Question, type QuizItem } from "../../lib/quizTypes";
import {
  LANGUAGE_NAME,
  pickWelcomeItems,
  tallyWelcome,
  type SectionTally,
  type WelcomePick,
} from "../../lib/welcome";
import ConviGuide from "./ConviGuide";
import TestMode from "./TestMode";

/**
 * The first time somebody opens practice for a language.
 *
 * Convi says hello, then a five-question round across the four things a trip
 * needs on day one (a restaurant, a beer, getting around, starting a convo),
 * in a random order. After it, a card shows how each section went, and then
 * the path: the same sections, waiting to be worked through properly.
 *
 * Every question is multiple choice and asked forward (the moment in English,
 * the line to say), so the first thing anybody meets is the thing the site is
 * for, and nothing asks them to type a language they came here to start.
 */
interface Props {
  locale: string;
  /** The whole deck, for the questions and their wrong options. */
  items: QuizItem[];
  /** Where the round goes when it is over or skipped: the path. */
  onDone: () => void;
  /** A round was played; the parent rereads streaks and counts. */
  onRoundComplete: () => void;
}

type Phase = "hello" | "round" | "results";

function buildWelcomeRound(picks: WelcomePick[], items: QuizItem[]): Question[] {
  return picks.flatMap(({ item }) => {
    // Wrong options from the same section first, the rest of the deck after.
    const section = items.filter((i) => i.categoryId === item.categoryId);
    const q = buildQuestion(item, false, "choice", section, items);
    return q && q.form === "choice" && q.options.length >= 3 ? [q] : [];
  });
}

export default function WelcomeRound({ locale, items, onDone, onRoundComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("hello");
  const [tally, setTally] = useState<SectionTally[]>([]);
  const language = LANGUAGE_NAME[locale] ?? "the language";

  // Drawn once per visit: a re-render must not reshuffle the round under you.
  const picks = useMemo(() => pickWelcomeItems(items), [items]);
  const round = useMemo(() => buildWelcomeRound(picks, items), [picks, items]);
  const asked = useMemo(() => {
    const ids = new Set(round.map((q) => q.itemId));
    return picks.filter((p) => ids.has(p.item.id));
  }, [picks, round]);
  const roundItems = useMemo(() => asked.map((p) => p.item), [asked]);

  const startButton = useRef<HTMLButtonElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (phase === "hello") startButton.current?.focus({ preventScroll: true });
    if (phase === "results") doneButton.current?.focus({ preventScroll: true });
  }, [phase]);

  if (phase === "hello") {
    return (
      <div className="welcome">
        <ConviGuide>
          <p className="convi-bubble-title">Welcome to Try Convi!</p>
          <p>Where I teach you how to speak like a local.</p>
        </ConviGuide>
        <p className="welcome-sub">
          Let's warm up with {round.length} quick questions in {language}: ordering at a
          restaurant, asking for a beer, getting around and starting a convo. Pick what you'd
          say. Wrong answers come back around, so you can't fail this one.
        </p>
        <div className="welcome-actions">
          <button
            ref={startButton}
            type="button"
            className="welcome-primary"
            onClick={() => setPhase("round")}
          >
            Let's go
          </button>
          <button type="button" className="welcome-skip" onClick={onDone}>
            Skip to the practice path
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gone once the results are up: its answer drawer is pinned to the
          bottom of the screen and would show through behind the card. */}
      {phase === "round" && (
        <>
      <p className="stage-line">
        <span>Welcome round</span>
      </p>
      <TestMode
        items={roundItems}
        allItems={items}
        locale={locale}
        setId="__welcome__"
        scoreKey={null}
        nextStageId={null}
        nextStageTitle={null}
        onChooseStage={() => onDone()}
        onDrillMistakes={() => onDone()}
        onBackToPath={onDone}
        onRoundComplete={onRoundComplete}
        makeRound={() => round}
        onFinish={(firstTries) => {
          setTally(tallyWelcome(asked, firstTries));
          setPhase("results");
        }}
      />
        </>
      )}

      {phase === "results" && (
        <div className="email-prompt welcome-results" role="dialog" aria-modal="true" aria-labelledby="welcome-results-title">
          <div className="email-prompt-card welcome-results-card">
            <ConviGuide size="small">
              <p id="welcome-results-title" className="convi-bubble-title">
                {tally.every((t) => t.right === t.total)
                  ? "You're a natural!"
                  : tally.some((t) => t.right > 0)
                    ? "Nice start!"
                    : "Good warm-up!"}
              </p>
              <p>Here's how you did in each section.</p>
            </ConviGuide>

            <ul className="welcome-tally">
              {tally.map((t) => (
                <li key={t.stage} className={t.right === t.total ? "is-full" : ""}>
                  <span className="welcome-tally-label">{t.label}</span>
                  <span className="welcome-tally-score">
                    {t.right} of {t.total} right
                  </span>
                  <span
                    className="welcome-tally-bar"
                    role="img"
                    aria-label={`${t.right} of ${t.total} right`}
                  >
                    <span style={{ width: `${(t.right / t.total) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>

            <p className="email-prompt-sub">
              Each one is a section on your practice path. Work through them a round at a time
              to fill the circles.
            </p>
            <button ref={doneButton} type="button" className="email-prompt-submit" onClick={onDone}>
              Go to my practice path
            </button>
          </div>
        </div>
      )}
    </>
  );
}
