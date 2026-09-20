/**
 * What to say to somebody who has stopped coming back, and when to stop saying
 * it.
 *
 * Pure on purpose, and dependency-free: no Redis, no Resend, no content files.
 * The cron reads a subscriber's record, asks this, and sends whatever comes
 * back — so the part with the judgement in it is the part under test, the same
 * split the quiz engine uses.
 *
 * The judgement is mostly about restraint. Four nudges per silence, never two
 * inside 48 hours, nothing at all until two days have passed, and the last one
 * says out loud that it is the last. A reminder that keeps arriving after
 * somebody has decided is not a reminder, it is the reason they mark the sender
 * as spam.
 */

/** Days of silence at which each successive nudge becomes due. */
export const LADDER = [2, 4, 8, 16] as const;

/** Nudges per silence. Reset by a single visit, because that is the point. */
export const MAX_NUDGES = LADDER.length;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Never two inside this, whatever the ladder says. */
export const MIN_GAP_MS = 2 * DAY_MS;

/** What the store knows about one subscriber, as far as this decision needs. */
export interface ReminderState {
  /** Epoch ms of their last heartbeat — the last time they opened the site. */
  lastSeen: number;
  /** Epoch ms of the last nudge sent, or null if none has been. */
  lastSentAt: number | null;
  /**
   * Nudges sent since that last heartbeat. Zeroed when they come back, which is
   * what makes the ladder a ladder per silence rather than per lifetime.
   */
  sentSinceSeen: number;
  /** Their day streak as of the last heartbeat. Zero if it had already gone. */
  streak: number;
  /** Which edition to talk about: "Spanish", "Stockholm". */
  language: string;
  region: string;
}

export interface Nudge {
  /** 0-based rung, so the caller can record what it sent. */
  step: number;
  /** Days of silence this was written for. */
  daysAway: number;
  /** Notification heading, and the email's <h1>. */
  title: string;
  /** One sentence. The whole of a push notification's body. */
  body: string;
  /** Email subject. Says the same thing as the title, standing alone. */
  subject: string;
  /** The grey line beside the subject in an inbox list. */
  preheader: string;
  /** Text on the one button. */
  cta: string;
  /** True on the rung that promises to stop. */
  last: boolean;
}

/**
 * The four rungs.
 *
 * Each one is written twice, because "you lost a 6-day streak" and "you lost a
 * 0-day streak" are not the same sentence and only one of them is true. A
 * streak the person never had is the single easiest thing to be wrong about
 * here, and being wrong about it in a push notification is unrecoverable.
 */
function copyFor(step: number, state: ReminderState, daysAway: number): Nudge {
  const { language, region, streak } = state;
  const hadStreak = streak > 0;
  const days = `${streak} day${streak === 1 ? "" : "s"}`;

  switch (step) {
    case 0:
      return hadStreak
        ? {
            step,
            daysAway,
            title: `Your ${days} are still on the board`,
            body: `One round keeps the streak. Eight questions, about two minutes.`,
            subject: `Your ${days} of ${language} are still on the board`,
            preheader: `One round keeps the streak going.`,
            cta: `Keep the streak`,
            last: false,
          }
        : {
            step,
            daysAway,
            title: `Two minutes of ${language}?`,
            body: `One round is eight questions. Nothing to sign up for.`,
            subject: `Two minutes of ${language}?`,
            preheader: `One round is eight questions. That's the whole ask.`,
            cta: `Practise ${language}`,
            last: false,
          };

    case 1:
      return hadStreak
        ? {
            step,
            daysAway,
            title: `Your ${days} streak has gone`,
            body: `It took one round to start the last one. Start another?`,
            subject: `Your ${days} ${language} streak has gone`,
            preheader: `It took one round to start the last one.`,
            cta: `Start a new streak`,
            last: false,
          }
        : {
            step,
            daysAway,
            title: `Still want the ${language}?`,
            body: `You cleared a section already. The next one is shorter.`,
            subject: `Still want the ${language}?`,
            preheader: `You cleared a section already, and the next one is shorter.`,
            cta: `Pick up where you left off`,
            last: false,
          };

    case 2:
      return {
        step,
        daysAway,
        title: `Still going to ${region}?`,
        body: `The taxi, the bar and the morning after are all still here.`,
        subject: `Still going to ${region}?`,
        preheader: `The taxi, the bar and the morning after are all still here.`,
        cta: `Open the path`,
        last: false,
      };

    default:
      return {
        step,
        daysAway,
        title: `Last nudge, promise`,
        body: `We'll stop after this one. ${language} is here whenever you want it.`,
        subject: `Last nudge from Try Convi, promise`,
        preheader: `This is the last one. No unsubscribing needed.`,
        cta: `One more round`,
        last: true,
      };
  }
}

/**
 * The nudge due now, or null for "say nothing".
 *
 * Null is the answer most of the time and is never an error: somebody who was
 * here yesterday, somebody nudged the day before, and somebody who has had all
 * four all read the same from here.
 */
export function planNudge(state: ReminderState, now = Date.now()): Nudge | null {
  if (state.sentSinceSeen >= MAX_NUDGES) return null;

  // Floor, so "two days away" means two full days have passed rather than any
  // moment after midnight on the second one.
  const daysAway = Math.floor((now - state.lastSeen) / DAY_MS);
  if (daysAway < 1) return null;

  const due = LADDER[state.sentSinceSeen];
  if (due === undefined || daysAway < due) return null;

  // The ladder can come due twice in a row after a long gap — sixteen days of
  // silence satisfies every rung at once — so the floor on the gap is what
  // stops four notifications arriving in one afternoon.
  if (state.lastSentAt !== null && now - state.lastSentAt < MIN_GAP_MS) return null;

  return copyFor(state.sentSinceSeen, state, daysAway);
}
