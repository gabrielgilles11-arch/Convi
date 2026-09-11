/**
 * Anonymous usage counters.
 *
 * The site's only analytics is Vercel's, which answers "how many people
 * arrived" and nothing else. Everything that would tell you whether the thing
 * is working — did anyone finish a round, did anyone come back the next day —
 * lives in each visitor's localStorage and never leaves the device. This is the
 * smallest fix for that: a handful of integers.
 *
 * Nothing here identifies anybody. There is no visitor id, no cookie, no IP
 * stored, and no event carries anything that could be traced to a person. The
 * client knows its own history and reports only a bucket — "somebody on their
 * first day finished a Swedish round" — which is then added to a running total
 * and cannot be taken apart again. That keeps the published privacy policy
 * true as written.
 *
 * The store is optional. With no Redis configured every record is a no-op and
 * the dashboard reads zero, exactly as the rate limiter fails open.
 */
import { kv } from "./kv";
import type { Locale } from "./content";
import { AGE_BUCKETS, MILESTONES, type AgeBucket, type Milestone } from "./usageEvents";

export { MILESTONES, ageBucket, type AgeBucket } from "./usageEvents";

const PREFIX = "convi:stats";

/** Daily keys are kept a little over a year, then expire themselves. */
const DAY_TTL_SECONDS = 400 * 24 * 60 * 60;

const LOCALES: Locale[] = ["es-ES", "sv-SE", "de-DE"];

export interface UsageEvent {
  kind: "visit" | "round";
  /** Which deck, for a round. */
  locale?: Locale;
  /** How long this device has been around — see AgeBucket. */
  age: AgeBucket;
  /** A lifetime-round threshold crossed by this event, if any. */
  milestone?: number;
}

/** UTC day, because these are server-side totals rather than anyone's streak. */
export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parses whatever arrived on the wire into an event, or null.
 *
 * Counters are writable by anyone who can reach the endpoint, so nothing is
 * trusted: every field is checked against a fixed set, and anything unexpected
 * drops the whole event rather than being coerced into a bucket.
 */
export function parseEvent(body: unknown): UsageEvent | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const kind = raw.kind;
  if (kind !== "visit" && kind !== "round") return null;

  const age = raw.age;
  if (age !== "new" && age !== "d1" && age !== "d2-6" && age !== "d7+") return null;

  const event: UsageEvent = { kind, age };

  if (raw.locale !== undefined) {
    if (!LOCALES.includes(raw.locale as Locale)) return null;
    event.locale = raw.locale as Locale;
  }

  if (raw.milestone !== undefined) {
    if (!MILESTONES.includes(raw.milestone as Milestone)) return null;
    event.milestone = raw.milestone as number;
  }

  return event;
}

/**
 * Adds one event to the totals.
 *
 * Written as a pipeline so a round is one round trip rather than six. It never
 * throws: a counter that failed to increment is not a reason to fail the thing
 * the learner was actually doing.
 */
export async function record(event: UsageEvent, now = new Date()): Promise<void> {
  if (!kv) return;

  const day = utcDay(now);
  const daily: string[] = [`${PREFIX}:day:${day}:${event.kind}s`, `${PREFIX}:day:${day}:age:${event.age}`];
  const totals: string[] = [`${PREFIX}:total:${event.kind}s`];

  if (event.kind === "round" && event.locale) {
    daily.push(`${PREFIX}:day:${day}:rounds:${event.locale}`);
    totals.push(`${PREFIX}:total:rounds:${event.locale}`);
  }

  if (event.milestone !== undefined) {
    totals.push(`${PREFIX}:total:reached:${event.milestone}`);
  }

  try {
    const pipe = kv.pipeline();
    for (const key of daily) {
      pipe.incr(key);
      // Refreshed on every write rather than set once, which would need a
      // separate read to know whether the key is new.
      pipe.expire(key, DAY_TTL_SECONDS);
    }
    for (const key of totals) pipe.incr(key);
    await pipe.exec();
  } catch {
    // The store is down or the quota is spent. Counting is not worth an error
    // page.
  }
}

export interface DayRow {
  day: string;
  visits: number;
  rounds: number;
  byLocale: Record<Locale, number>;
  byAge: Record<AgeBucket, number>;
}

export interface Stats {
  configured: boolean;
  totals: {
    visits: number;
    rounds: number;
    byLocale: Record<Locale, number>;
    /** Devices that have ever reached each lifetime-round threshold. */
    reached: Record<number, number>;
  };
  days: DayRow[];
}

function zeroLocales(): Record<Locale, number> {
  return { "es-ES": 0, "sv-SE": 0, "de-DE": 0 };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reads the last `days` days plus the lifetime totals.
 *
 * The days are generated rather than indexed — a date is a date, and keeping a
 * separate set of "days that have data" would be another key to keep in step
 * with these ones for no gain.
 */
export async function readStats(days = 30, now = new Date()): Promise<Stats> {
  const empty: Stats = {
    configured: kv !== null,
    totals: { visits: 0, rounds: 0, byLocale: zeroLocales(), reached: {} },
    days: [],
  };
  if (!kv) return empty;

  const dayKeys: string[] = [];
  for (let back = days - 1; back >= 0; back--) {
    dayKeys.push(utcDay(new Date(now.getTime() - back * 86400000)));
  }

  // Every key this reader wants, in one flat list, so the whole dashboard is a
  // single MGET rather than a request per number.
  const keys: string[] = [
    `${PREFIX}:total:visits`,
    `${PREFIX}:total:rounds`,
    ...LOCALES.map((l) => `${PREFIX}:total:rounds:${l}`),
    ...MILESTONES.map((m) => `${PREFIX}:total:reached:${m}`),
  ];
  for (const day of dayKeys) {
    keys.push(`${PREFIX}:day:${day}:visits`, `${PREFIX}:day:${day}:rounds`);
    for (const locale of LOCALES) keys.push(`${PREFIX}:day:${day}:rounds:${locale}`);
    for (const age of AGE_BUCKETS) keys.push(`${PREFIX}:day:${day}:age:${age}`);
  }

  let values: unknown[];
  try {
    values = await kv.mget<unknown[]>(...keys);
  } catch {
    return empty;
  }

  let at = 0;
  const take = () => num(values[at++]);

  const totals = {
    visits: take(),
    rounds: take(),
    byLocale: zeroLocales(),
    reached: {} as Record<number, number>,
  };
  for (const locale of LOCALES) totals.byLocale[locale] = take();
  for (const milestone of MILESTONES) totals.reached[milestone] = take();

  const rows: DayRow[] = dayKeys.map((day) => {
    const row: DayRow = {
      day,
      visits: take(),
      rounds: take(),
      byLocale: zeroLocales(),
      byAge: { new: 0, d1: 0, "d2-6": 0, "d7+": 0 },
    };
    for (const locale of LOCALES) row.byLocale[locale] = take();
    for (const age of AGE_BUCKETS) row.byAge[age] = take();
    return row;
  });

  return { configured: true, totals, days: rows };
}
