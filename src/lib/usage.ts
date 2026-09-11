/**
 * Reporting a round, anonymously.
 *
 * The device keeps its own history — when it first turned up, which
 * lifetime-round thresholds it has already reported — and sends only a bucket.
 * No identifier is generated, stored or transmitted, so two events from the
 * same person are indistinguishable from two events by two people once they
 * land. See ../lib/stats for what is done with them.
 *
 * Everything here is best-effort and silent. A learner finishing a round must
 * never see a counter fail.
 */
import { ageBucket, MILESTONES, type AgeBucket } from "./usageEvents";
import { roundsCompleted } from "./progress";

const STORAGE_KEY = "convi:usage:v1";
const ENDPOINT = "/api/stats";

interface UsageState {
  /** Local calendar day this device first reported anything. */
  firstDay: string | null;
  /** Last day a visit was reported, so it is counted once per day. */
  lastVisitDay: string | null;
  /** Lifetime-round thresholds already reported. */
  sent: number[];
}

function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function load(): UsageState {
  const blank: UsageState = { firstDay: null, lastVisitDay: null, sent: [] };
  if (typeof window === "undefined") return blank;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...blank, ...JSON.parse(raw) } : blank;
  } catch {
    return blank;
  }
}

function save(state: UsageState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode. The device will look new again tomorrow, which overstates
    // first-day visitors slightly and is not worth a second mechanism.
  }
}

/** How old this device is, in the coarse buckets the server accepts. */
function currentAge(state: UsageState): AgeBucket {
  return ageBucket(state.firstDay ? daysBetween(state.firstDay, dayKey()) : 0);
}

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

/**
 * Reports that somebody opened practice today. Counted once per calendar day,
 * so the number is "days used" rather than "times the component mounted".
 */
export function recordVisit(): void {
  if (typeof window === "undefined") return;
  const state = load();
  const today = dayKey();
  if (state.lastVisitDay === today) return;

  // Read before the first day is written, so a device's very first visit is
  // reported as new rather than as nought days old by accident.
  const age = currentAge(state);
  if (!state.firstDay) state.firstDay = today;
  state.lastVisitDay = today;
  save(state);

  send({ kind: "visit", age });
}

/**
 * Reports a finished round. Called after the round is scored, so it counts the
 * same thing the learner just saw a score for.
 */
export function recordRound(locale: string): void {
  if (typeof window === "undefined") return;
  const state = load();
  if (!state.firstDay) {
    state.firstDay = dayKey();
    save(state);
  }

  // The highest threshold this round has just crossed, reported once ever. The
  // lifetime count comes from progress, which has already been written by the
  // time this runs.
  const lifetime = roundsCompleted();
  const sent = state.sent ?? [];
  const milestone = MILESTONES.filter((m) => lifetime >= m && !sent.includes(m)).pop();
  if (milestone !== undefined) {
    state.sent = [...sent, milestone];
    save(state);
  }

  send({ kind: "round", locale, age: currentAge(state), milestone });
}
