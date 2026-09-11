/**
 * Telling the server something happened.
 *
 * Two beacons. Every page sends a view, which carries nothing at all — the
 * server reads what it needs from the request itself. Practice additionally
 * sends a finished round, which carries the deck and, once ever per device,
 * the lifetime total it just crossed. That last one is the only thing the
 * browser has to remember, and it is a list of five numbers.
 *
 * Everything here is best-effort and silent. A learner finishing a round must
 * never see a counter fail.
 */
import { MILESTONES } from "./usageEvents";
import { roundsCompleted } from "./progress";

const STORAGE_KEY = "convi:usage:v1";
const ENDPOINT = "/api/stats";

function send(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    // sendBeacon survives the page being closed mid-request, which fetch does
    // not reliably do — and a round often ends with someone leaving.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) {
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // No beacon, no fetch, no problem.
  }
}

/** One page was looked at. Sent from the layout, so this covers every page. */
export function recordView(): void {
  send({ kind: "view" });
}

/**
 * Reports a finished round. Called after the round is scored, so it counts the
 * same thing the learner just saw a score for.
 */
export function recordRound(locale: string): void {
  if (typeof window === "undefined") return;

  // The highest threshold this round has just crossed, reported once ever. The
  // lifetime count comes from progress, which has already been written by the
  // time this runs.
  const lifetime = roundsCompleted();
  let sent: number[] = [];
  try {
    sent = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}").sent ?? [];
  } catch {
    // Private mode, or nothing stored yet. Worst case a milestone is reported
    // twice from one device, which is not worth a second mechanism.
  }

  const milestone = MILESTONES.filter((m) => lifetime >= m && !sent.includes(m)).pop();
  if (milestone !== undefined) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sent: [...sent, milestone] }));
    } catch {
      // As above.
    }
  }

  send({ kind: "round", locale, milestone });
}
