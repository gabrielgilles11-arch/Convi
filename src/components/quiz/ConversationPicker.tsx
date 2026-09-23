import { useState } from "react";
import { groupByCategory, type Conversation, type ConversationGroup } from "../../lib/conversationTypes";

/**
 * Picking which conversation to have.
 *
 * Two screens, not one. Every conversation in the edition used to be on screen
 * at once: ten headings, twenty-two cards, two and a half thousand pixels of
 * wall, and nothing to do at the top of it but scroll. The first screen is now
 * the places you can go, one tile each, all of them visible without scrolling;
 * the second is the conversations inside the place you picked.
 *
 * A category holding a single conversation skips the second screen and opens
 * it, because a list of one is a question with one answer.
 */
interface Props {
  conversations: Conversation[];
  /** Ids of the conversations this browser has been through at least once. */
  finished: string[];
  onStart: (id: string) => void;
  onBack: () => void;
}

/**
 * A category title cut down to the name of a place.
 *
 * The authored titles are written for a scenario page, where they are a
 * heading with room to qualify itself: "Getting around (taxi + metro)",
 * "Nightlife — into the club & making friends". On a tile beside an icon that
 * qualification is noise, and it pushes every title onto a second line. The
 * full title is still the heading on screen two, which is where somebody who
 * wants to know exactly what is in here has just arrived.
 *
 * Two cuts only, both unambiguous: a trailing parenthetical, and anything
 * after a dash. Nothing that would leave a fragment, so "Robbed & emergencies"
 * and "Shopping, markets & haggling" are left whole.
 */
export function placeName(title: string): string {
  const cut = title.split(/\s[—–-]\s/)[0]!.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cut.length >= 3 ? cut : title;
}

/** How many of a category's conversations this browser has finished. */
function doneCount(group: ConversationGroup, done: Set<string>): number {
  return group.conversations.filter((c) => done.has(c.id)).length;
}

/**
 * What sits on the right of a tile: go in, part done, or done.
 *
 * Drawn rather than written out as "2/4", because the tile is scanned and not
 * read: a part-filled ring says "started" at a glance where a fraction has to
 * be parsed. The count is still in the tile's meta line for anybody who wants
 * the number, and in the button's accessible name for anybody who cannot see
 * the ring at all.
 */
function TileMark({ done, total }: { done: number; total: number }) {
  // Nothing held yet. An empty ring here reads as an unchecked radio button,
  // and ten of them read as a form; a chevron says "go in" instead.
  if (done === 0) {
    return (
      <svg className="cat-go" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 5 L16 12 L9 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const r = 13;
  const circumference = 2 * Math.PI * r;
  const filled = (done / total) * circumference;

  return (
    <svg className="cat-ring" viewBox="0 0 32 32" aria-hidden="true">
      <circle className="cat-ring-track" cx="16" cy="16" r={r} fill="none" strokeWidth="3" />
      <circle
        className="cat-ring-fill"
        cx="16"
        cy="16"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        /* Start at twelve o'clock rather than three. */
        transform="rotate(-90 16 16)"
      />
      {done === total ? (
        <path
          d="M10 16.5 L14 20.5 L22 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text className="cat-ring-text" x="16" y="16" textAnchor="middle" dominantBaseline="central">
          {done}
        </text>
      )}
    </svg>
  );
}

export default function ConversationPicker({
  conversations,
  finished,
  onStart,
  onBack,
}: Props) {
  const groups = groupByCategory(conversations);
  const done = new Set(finished);

  /** Which category is open, by id. Null is the grid of places. */
  const [openId, setOpenId] = useState<string | null>(null);

  if (groups.length === 0) {
    return <p className="quiz-loading">No conversations in this edition yet.</p>;
  }

  const open = groups.find((g) => g.categoryId === openId) ?? null;

  // --- Screen two: the conversations inside one place.
  if (open) {
    return (
      <div className="convo-picker">
        <p className="stage-line">
          <button type="button" className="stage-jump" onClick={() => setOpenId(null)}>
            All places
          </button>
          <span>
            <span className="convo-head-icon" aria-hidden="true">{open.categoryIcon}</span>
            {open.categoryTitle}
          </span>
        </p>

        <ul className="convo-list">
          {open.conversations.map((convo) => (
            <li key={convo.id}>
              <button
                type="button"
                className={`convo-card${done.has(convo.id) ? " is-done" : ""}`}
                onClick={() => onStart(convo.id)}
              >
                <span className="convo-card-main">
                  <span className="convo-card-title">{convo.title}</span>
                  <span className="convo-card-meta">
                    {convo.turns.length} turns
                    {/* The opening beat, as a one-line trailer for the rest.
                        It is the situation rather than a line of the language:
                        the point of the card is whether this is the moment you
                        want, and the moment is in English. */}
                    {" · "}
                    {convo.turns[0]?.situation}
                  </span>
                </span>
                {done.has(convo.id) && (
                  <svg className="convo-card-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M5 12.5 L10 17.5 L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // --- Screen one: the places.
  const total = conversations.length;
  const finishedHere = conversations.filter((c) => done.has(c.id)).length;

  return (
    <div className="convo-picker">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          Back to the path
        </button>
        <span>Talk Mode</span>
      </p>

      {/* Two sentences, not five. The long version explained the grading rules
          before anybody had picked a place to be graded in. */}
      <p className="convo-intro">
        Pick a place and hold the conversation that happens there. You type
        your side, they answer, and when it's over the next one carries on.
      </p>

      <p className="convo-tally">
        <strong>{finishedHere}</strong> of {total} conversations held
      </p>

      <ul className="convo-cats">
        {groups.map((group) => {
          const hits = doneCount(group, done);
          const count = group.conversations.length;
          const complete = hits === count;
          // A list of one is a question with one answer, so skip it.
          const go = () =>
            count === 1 ? onStart(group.conversations[0]!.id) : setOpenId(group.categoryId);

          return (
            <li key={group.categoryId}>
              <button
                type="button"
                className={`convo-cat${complete ? " is-done" : ""}`}
                onClick={go}
                aria-label={`${group.categoryTitle}, ${hits} of ${count} held`}
              >
                <span className="convo-cat-icon" aria-hidden="true">{group.categoryIcon}</span>
                <span className="convo-cat-body">
                  <span className="convo-cat-title">{placeName(group.categoryTitle)}</span>
                  <span className="convo-cat-meta">
                    {count === 1 ? "1 conversation" : `${count} conversations`}
                    {hits > 0 && ` · ${hits} held`}
                  </span>
                </span>
                <TileMark done={hits} total={count} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
