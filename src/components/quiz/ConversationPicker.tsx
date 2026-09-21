import { groupByCategory, type Conversation } from "../../lib/conversationTypes";

/**
 * Picking which conversation to have.
 *
 * Grouped by category, because the category is the thing people recognize —
 * "Getting around" — while the subsection is the useful unit to walk: you want
 * the taxi, not all of getting around at once. Both are on screen, so the
 * choice is one tap after one scan.
 */
interface Props {
  conversations: Conversation[];
  /** Ids of the conversations this browser has been through at least once. */
  finished: string[];
  onStart: (id: string) => void;
  onBack: () => void;
}

export default function ConversationPicker({
  conversations,
  finished,
  onStart,
  onBack,
}: Props) {
  const groups = groupByCategory(conversations);
  const done = new Set(finished);

  if (groups.length === 0) {
    return <p className="quiz-loading">No conversations in this edition yet.</p>;
  }

  return (
    <div className="convo-picker">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          Back to the path
        </button>
        <span>Talk Mode</span>
      </p>

      <p className="convo-intro">
        Pick a place and hold the conversation that happens there. They speak
        first, in the language you're learning, and you type back. Get it wrong
        and you'll be shown the line and what it means. Every line was written
        for that moment, so there is always a right thing to say.
      </p>

      {groups.map((group) => (
        <section className="convo-group" key={group.categoryId}>
          <h3 className="convo-group-title">{group.categoryTitle}</h3>
          <ul className="convo-list">
            {group.conversations.map((convo) => (
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
        </section>
      ))}
    </div>
  );
}
