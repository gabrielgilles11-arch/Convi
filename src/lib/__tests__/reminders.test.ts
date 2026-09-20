import { describe, expect, it } from "vitest";
import {
  planNudge,
  LADDER,
  MAX_NUDGES,
  MIN_GAP_MS,
  type ReminderState,
} from "../reminderPlan";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 17, 0, 0);

function state(over: Partial<ReminderState> = {}): ReminderState {
  return {
    lastSeen: NOW - 2 * DAY,
    lastSentAt: null,
    sentSinceSeen: 0,
    streak: 0,
    language: "Spanish",
    region: "Spain",
    ...over,
  };
}

describe("planNudge: when to say nothing", () => {
  it("says nothing to somebody who was here today", () => {
    expect(planNudge(state({ lastSeen: NOW - 60 * 1000 }), NOW)).toBeNull();
  });

  it("says nothing before the first rung comes due", () => {
    for (let hours = 0; hours < LADDER[0] * 24; hours += 6) {
      expect(planNudge(state({ lastSeen: NOW - hours * 60 * 60 * 1000 }), NOW)).toBeNull();
    }
  });

  it("stops for good once every rung has been used", () => {
    // A year of silence and the ladder is still finished.
    expect(
      planNudge(state({ sentSinceSeen: MAX_NUDGES, lastSeen: NOW - 365 * DAY }), NOW)
    ).toBeNull();
  });

  /**
   * The case that would otherwise send four notifications in one afternoon: a
   * long gap satisfies every rung at once, so the floor on the interval is the
   * only thing holding them apart.
   */
  it("never sends two inside the minimum gap, however overdue the ladder is", () => {
    const overdue = state({ lastSeen: NOW - 40 * DAY, sentSinceSeen: 1, lastSentAt: NOW - 1000 });
    expect(planNudge(overdue, NOW)).toBeNull();
    expect(planNudge({ ...overdue, lastSentAt: NOW - MIN_GAP_MS - 1 }, NOW)).not.toBeNull();
  });

  it("never looks into the future if a clock disagrees", () => {
    expect(planNudge(state({ lastSeen: NOW + 5 * DAY }), NOW)).toBeNull();
  });
});

describe("planNudge: the ladder", () => {
  it("sends the first nudge on the day it comes due", () => {
    const nudge = planNudge(state({ lastSeen: NOW - LADDER[0] * DAY }), NOW);
    expect(nudge?.step).toBe(0);
    expect(nudge?.last).toBe(false);
  });

  it("walks one rung per nudge, in order, and ends on the last one", () => {
    const seen: number[] = [];
    let sent = 0;
    let lastSentAt: number | null = null;
    let now = NOW;

    // Walk a full silence a day at a time, as the daily cron would.
    for (let day = 0; day <= 40 && sent < MAX_NUDGES; day++) {
      now = NOW + day * DAY;
      const nudge = planNudge(
        state({ lastSeen: NOW, sentSinceSeen: sent, lastSentAt, streak: 3 }),
        now
      );
      if (!nudge) continue;
      seen.push(nudge.step);
      sent += 1;
      lastSentAt = now;
    }

    expect(seen).toEqual([0, 1, 2, 3]);
    expect(sent).toBe(MAX_NUDGES);
  });

  it("promises to stop, and only on the final rung", () => {
    for (let step = 0; step < MAX_NUDGES; step++) {
      const nudge = planNudge(
        state({ lastSeen: NOW - 60 * DAY, sentSinceSeen: step, lastSentAt: null }),
        NOW
      );
      expect(nudge?.last).toBe(step === MAX_NUDGES - 1);
    }
  });
});

describe("planNudge: the copy", () => {
  const rungs = Array.from({ length: MAX_NUDGES }, (_, step) => step);

  it("fills in every field on every rung, either way round", () => {
    for (const step of rungs) {
      for (const streak of [0, 1, 7]) {
        const nudge = planNudge(
          state({ lastSeen: NOW - 60 * DAY, sentSinceSeen: step, streak }),
          NOW
        );
        expect(nudge).not.toBeNull();
        for (const field of ["title", "body", "subject", "preheader", "cta"] as const) {
          expect(nudge![field].trim()).not.toBe("");
        }
      }
    }
  });

  /**
   * The single easiest thing to get wrong here, and the least recoverable: a
   * push notification mourning a streak somebody never had.
   */
  it("never mentions a streak to somebody who hasn't got one", () => {
    for (const step of rungs) {
      const nudge = planNudge(
        state({ lastSeen: NOW - 60 * DAY, sentSinceSeen: step, streak: 0 }),
        NOW
      );
      const text = `${nudge!.title} ${nudge!.body} ${nudge!.subject} ${nudge!.preheader}`;
      expect(text.toLowerCase()).not.toContain("streak");
    }
  });

  it("gets the day count and its plural right", () => {
    const one = planNudge(state({ lastSeen: NOW - 60 * DAY, streak: 1 }), NOW)!;
    expect(one.subject).toContain("1 day of");
    const many = planNudge(state({ lastSeen: NOW - 60 * DAY, streak: 9 }), NOW)!;
    expect(many.subject).toContain("9 days of");
  });

  it("talks about the edition it was given, not a hardcoded one", () => {
    const swedish = planNudge(
      state({ lastSeen: NOW - 60 * DAY, sentSinceSeen: 2, language: "Swedish", region: "Stockholm" }),
      NOW
    )!;
    expect(swedish.title).toContain("Stockholm");
    expect(swedish.title).not.toContain("Spain");
  });

  it("keeps a push body short enough to survive a lock screen", () => {
    for (const step of rungs) {
      for (const streak of [0, 12]) {
        const nudge = planNudge(
          state({ lastSeen: NOW - 60 * DAY, sentSinceSeen: step, streak }),
          NOW
        )!;
        // Android truncates a collapsed notification around here; anything
        // longer is a sentence nobody reads the end of.
        expect(nudge.title.length).toBeLessThanOrEqual(65);
        expect(nudge.body.length).toBeLessThanOrEqual(120);
      }
    }
  });
});
