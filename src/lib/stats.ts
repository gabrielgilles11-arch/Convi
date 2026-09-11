/**
 * Anonymous usage counters.
 *
 * The site's only analytics was Vercel's, which answers "how many people
 * arrived" and nothing else. Everything that would tell you whether the thing
 * is working — did anyone come back, did anyone finish a round — was either
 * missing or sitting in a visitor's localStorage where nobody could read it.
 * This is the smallest fix for that: a few dozen integers.
 *
 * Nothing here identifies anybody. No IP address is stored, no cookie is set,
 * and no visitor is given a name that survives a month of not visiting. A
 * returning visitor is recognised by a salted one-way hash that expires on its
 * own (see ./visitor) and is never turned back into an address, because
 * nothing needs to know which visitor it is. Countries are counted because a
 * country is not a person. The published privacy policy says exactly this.
 *
 * The store is optional. With no Redis configured every record is a no-op and
 * the dashboard reads zero, the same way the rate limiter fails open.
 */
import { kv } from "./kv";
import type { Locale } from "./content";
import { MILESTONES, type Milestone } from "./usageEvents";
import { countryOf, visitorHash } from "./visitor";

export { MILESTONES } from "./usageEvents";

const PREFIX = "convi:stats";

/** Daily keys are kept a little over a year, then expire themselves. */
const DAY_TTL_SECONDS = 400 * 24 * 60 * 60;

/**
 * How long a browser can stay away and still count as returning when it comes
 * back. It is also how long the hash lives: after this, the last trace of a
 * visit deletes itself.
 */
const VISITOR_TTL_SECONDS = 30 * 24 * 60 * 60;

const LOCALES: Locale[] = ["es-ES", "sv-SE", "de-DE"];

/** UTC day, because these are site-wide totals rather than anyone's streak. */
export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * What the browser is allowed to say.
 *
 * A page view carries nothing at all — everything that matters about it (which
 * address, which country) is read from the request on this side, where it
 * cannot be forged by a beacon and does not have to be trusted. A finished
 * round carries which deck it was and, once ever per device, which lifetime
 * total it just crossed.
 */
export interface UsageEvent {
  kind: "view" | "round";
  locale?: Locale;
  milestone?: Milestone;
}

/**
 * Parses whatever arrived on the wire, or null.
 *
 * Counters are writable by anyone who can reach the endpoint, so nothing is
 * trusted: every field is checked against a fixed set, and anything unexpected
 * drops the whole event rather than being coerced into a bucket.
 */
export function parseEvent(body: unknown): UsageEvent | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const kind = raw.kind;
  if (kind !== "view" && kind !== "round") return null;

  const event: UsageEvent = { kind };

  if (raw.locale !== undefined) {
    if (!LOCALES.includes(raw.locale as Locale)) return null;
    event.locale = raw.locale as Locale;
  }

  if (raw.milestone !== undefined) {
    if (!MILESTONES.includes(raw.milestone as Milestone)) return null;
    event.milestone = raw.milestone as Milestone;
  }

  return event;
}

/**
 * Adds one event to the totals.
 *
 * Never throws: a counter that failed to increment is not a reason to fail the
 * page the visitor was actually reading.
 */
export async function record(
  event: UsageEvent,
  request: Request,
  ip: string,
  now = new Date()
): Promise<void> {
  if (!kv) return;
  const day = utcDay(now);

  try {
    if (event.kind === "round") {
      const pipe = kv.pipeline();
      bump(pipe, `${PREFIX}:day:${day}:rounds`);
      bump(pipe, `${PREFIX}:total:rounds`);
      if (event.locale) {
        bump(pipe, `${PREFIX}:day:${day}:rounds:${event.locale}`);
        bump(pipe, `${PREFIX}:total:rounds:${event.locale}`);
      }
      if (event.milestone !== undefined) {
        bump(pipe, `${PREFIX}:total:reached:${event.milestone}`);
      }
      await pipe.exec();
      return;
    }

    await recordView(request, ip, day);
  } catch {
    // The store is down or the quota is spent. Counting is not worth an error
    // page.
  }
}

/** Increment, and push the key's expiry back out. */
function bump(pipe: ReturnType<NonNullable<typeof kv>["pipeline"]>, key: string): void {
  pipe.incr(key);
  // Refreshed on every write rather than set once, which would need a separate
  // read to know whether the key is new.
  pipe.expire(key, DAY_TTL_SECONDS);
}

/**
 * A page view, anywhere on the site.
 *
 * Views are counted for everyone. A visitor is counted once a day, and only
 * then is it worth asking whether this browser has been here before — which is
 * the one question this whole mechanism exists to answer.
 */
async function recordView(request: Request, ip: string, day: string): Promise<void> {
  if (!kv) return;

  const opening = kv.pipeline();
  bump(opening, `${PREFIX}:day:${day}:views`);
  bump(opening, `${PREFIX}:total:views`);
  await opening.exec();

  const hash = await visitorHash(ip, request.headers.get("user-agent") ?? "");
  // No salt means no way to recognise anybody without writing down something
  // that identifies them, so nothing else is recorded. Page views still count.
  if (!hash) return;

  // First view of the day from this browser? SET NX answers and claims it in
  // one step, so two tabs opening at once cannot both count as a visitor.
  const firstToday = await kv.set(`${PREFIX}:seen:${day}:${hash}`, 1, {
    nx: true,
    ex: 2 * 24 * 60 * 60,
  });
  if (!firstToday) return;

  const known = await kv.get<string>(`${PREFIX}:v:${hash}`);
  const pipe = kv.pipeline();

  bump(pipe, `${PREFIX}:day:${day}:visitors`);
  bump(pipe, `${PREFIX}:day:${day}:country:${countryOf(request)}`);

  if (known) {
    bump(pipe, `${PREFIX}:day:${day}:returning`);
    bump(pipe, `${PREFIX}:total:returning`);
  } else {
    bump(pipe, `${PREFIX}:day:${day}:new`);
    bump(pipe, `${PREFIX}:total:new`);
  }

  // Written every visit, so the thirty days runs from the last one rather than
  // the first — and so the record disappears entirely once somebody stops
  // coming.
  pipe.set(`${PREFIX}:v:${hash}`, day, { ex: VISITOR_TTL_SECONDS });
  await pipe.exec();
}

export interface DayRow {
  day: string;
  views: number;
  visitors: number;
  fresh: number;
  returning: number;
  rounds: number;
  byLocale: Record<Locale, number>;
}

export interface Stats {
  configured: boolean;
  /** False when no salt is available, which means no visitor counts at all. */
  recognising: boolean;
  totals: {
    views: number;
    fresh: number;
    returning: number;
    rounds: number;
    byLocale: Record<Locale, number>;
    /** Devices that have ever reached each lifetime-round count. */
    reached: Record<number, number>;
  };
  days: DayRow[];
  /** Visitor-days by country over the window, biggest first. */
  countries: { code: string; visitors: number }[];
}

function zeroLocales(): Record<Locale, number> {
  return { "es-ES": 0, "sv-SE": 0, "de-DE": 0 };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reads the window back, plus the lifetime totals.
 *
 * The days are generated rather than indexed — a date is a date, and keeping a
 * separate set of "days that have data" would be another key to hold in step
 * with these for no gain. Countries are the one thing that has to be scanned,
 * because the list of them is not known in advance.
 */
export async function readStats(days = 30, now = new Date()): Promise<Stats> {
  const empty: Stats = {
    configured: kv !== null,
    recognising: false,
    totals: {
      views: 0,
      fresh: 0,
      returning: 0,
      rounds: 0,
      byLocale: zeroLocales(),
      reached: {},
    },
    days: [],
    countries: [],
  };
  if (!kv) return empty;

  const dayKeys: string[] = [];
  for (let back = days - 1; back >= 0; back--) {
    dayKeys.push(utcDay(new Date(now.getTime() - back * 86400000)));
  }

  const keys: string[] = [
    `${PREFIX}:total:views`,
    `${PREFIX}:total:new`,
    `${PREFIX}:total:returning`,
    `${PREFIX}:total:rounds`,
    ...LOCALES.map((l) => `${PREFIX}:total:rounds:${l}`),
    ...MILESTONES.map((m) => `${PREFIX}:total:reached:${m}`),
  ];
  for (const day of dayKeys) {
    keys.push(
      `${PREFIX}:day:${day}:views`,
      `${PREFIX}:day:${day}:visitors`,
      `${PREFIX}:day:${day}:new`,
      `${PREFIX}:day:${day}:returning`,
      `${PREFIX}:day:${day}:rounds`
    );
    for (const locale of LOCALES) keys.push(`${PREFIX}:day:${day}:rounds:${locale}`);
  }

  let values: unknown[];
  let countries: { code: string; visitors: number }[];
  try {
    [values, countries] = await Promise.all([
      kv.mget<unknown[]>(...keys),
      readCountries(dayKeys),
    ]);
  } catch {
    return empty;
  }

  let at = 0;
  const take = () => num(values[at++]);

  const totals = {
    views: take(),
    fresh: take(),
    returning: take(),
    rounds: take(),
    byLocale: zeroLocales(),
    reached: {} as Record<number, number>,
  };
  for (const locale of LOCALES) totals.byLocale[locale] = take();
  for (const milestone of MILESTONES) totals.reached[milestone] = take();

  const rows: DayRow[] = dayKeys.map((day) => {
    const row: DayRow = {
      day,
      views: take(),
      visitors: take(),
      fresh: take(),
      returning: take(),
      rounds: take(),
      byLocale: zeroLocales(),
    };
    for (const locale of LOCALES) row.byLocale[locale] = take();
    return row;
  });

  return {
    configured: true,
    recognising: totals.fresh + totals.returning > 0,
    totals,
    days: rows,
    countries,
  };
}

/**
 * Country totals across the window.
 *
 * SCAN rather than a known key list, because which countries turn up is the
 * answer rather than the question. It is bounded by how many countries have
 * ever visited, which is at most a couple of hundred keys a day.
 */
async function readCountries(dayKeys: string[]): Promise<{ code: string; visitors: number }[]> {
  if (!kv) return [];
  const found = new Map<string, number>();

  for (const day of dayKeys) {
    let cursor = "0";
    do {
      const [next, batch] = await kv.scan(cursor, {
        match: `${PREFIX}:day:${day}:country:*`,
        count: 500,
      });
      cursor = String(next);
      if (batch.length) {
        const counts = await kv.mget<unknown[]>(...batch.map(String));
        batch.forEach((key, i) => {
          const code = String(key).split(":").pop() ?? "??";
          found.set(code, (found.get(code) ?? 0) + num(counts[i]));
        });
      }
    } while (cursor !== "0");
  }

  return [...found]
    .map(([code, visitors]) => ({ code, visitors }))
    .sort((a, b) => b.visitors - a.visitors);
}
