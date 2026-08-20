import { useMemo, useState } from "react";
import { shuffle, type MatchPair } from "../../lib/quizTypes";

interface Props {
  pairs: MatchPair[];
  /** Called once every row is paired off. */
  onDone: (clean: boolean, results: { itemId: string; correct: boolean }[]) => void;
  /** True once the round has scored this screen — the board goes read-only. */
  answered: boolean;
}

/**
 * A matching screen: target-language phrases on the left, meanings on the
 * right, tap one from each side to pair them off.
 *
 * The two columns are shuffled independently and only once, on mount — a
 * reshuffle on every tap would move the tile you were aiming at. Rows lock
 * green as they're solved rather than disappearing, so the board doesn't
 * reflow underneath your finger.
 *
 * A wrong pairing is not fatal: it flashes, clears, and you try again. What it
 * costs is the clean sweep — the screen only scores as correct if every row
 * went in first time, which is the same one-shot standard the other question
 * forms are held to.
 */
export default function MatchQuestion({ pairs, onDone, answered }: Props) {
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);

  const [pickedSource, setPickedSource] = useState<string | null>(null);
  const [pickedEn, setPickedEn] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  /** Rows that took more than one go — they lose the round its clean sweep. */
  const [slipped, setSlipped] = useState<string[]>([]);
  /** The pair currently flashing red, cleared on the next tap. */
  const [wrong, setWrong] = useState<{ source: string; en: string } | null>(null);

  const isSolved = (id: string) => solved.includes(id);

  function settleIfDone(nextSolved: string[], nextSlipped: string[]) {
    if (nextSolved.length < pairs.length) return;
    onDone(
      nextSlipped.length === 0,
      pairs.map((p) => ({ itemId: p.itemId, correct: !nextSlipped.includes(p.itemId) }))
    );
  }

  function attempt(sourceId: string, enId: string) {
    if (sourceId === enId) {
      const nextSolved = [...solved, sourceId];
      setSolved(nextSolved);
      setPickedSource(null);
      setPickedEn(null);
      setWrong(null);
      settleIfDone(nextSolved, slipped);
      return;
    }

    // Both halves of a wrong guess are marked: you didn't know either of them
    // well enough to place it, so both belong in the mistake queue.
    const nextSlipped = [...new Set([...slipped, sourceId, enId])];
    setSlipped(nextSlipped);
    setWrong({ source: sourceId, en: enId });
    setPickedSource(null);
    setPickedEn(null);
  }

  function pick(side: "source" | "en", id: string) {
    if (answered || isSolved(id)) return;
    setWrong(null);

    if (side === "source") {
      // Tapping the selected tile again clears it, so a misfire isn't a trap.
      if (pickedSource === id) return setPickedSource(null);
      if (pickedEn) return attempt(id, pickedEn);
      return setPickedSource(id);
    }

    if (pickedEn === id) return setPickedEn(null);
    if (pickedSource) return attempt(pickedSource, id);
    setPickedEn(id);
  }

  const tileClass = (id: string, side: "source" | "en") => {
    const picked = side === "source" ? pickedSource : pickedEn;
    const flashing = wrong && (side === "source" ? wrong.source : wrong.en) === id;
    return [
      "match-tile",
      isSolved(id) ? "is-solved" : "",
      picked === id ? "is-picked" : "",
      flashing ? "is-wrong" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div className="match-board">
      <div className="match-col" role="group" aria-label="Phrases">
        {left.map((p) => (
          <button
            key={p.itemId}
            type="button"
            className={tileClass(p.itemId, "source")}
            onClick={() => pick("source", p.itemId)}
            disabled={answered || isSolved(p.itemId)}
            aria-pressed={pickedSource === p.itemId}
          >
            {p.source}
          </button>
        ))}
      </div>

      <div className="match-col" role="group" aria-label="Meanings">
        {right.map((p) => (
          <button
            key={p.itemId}
            type="button"
            className={tileClass(p.itemId, "en")}
            onClick={() => pick("en", p.itemId)}
            disabled={answered || isSolved(p.itemId)}
            aria-pressed={pickedEn === p.itemId}
          >
            {p.en}
          </button>
        ))}
      </div>

      <p className="match-progress" role="status">
        {solved.length} of {pairs.length} matched
      </p>
    </div>
  );
}
