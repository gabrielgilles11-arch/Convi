/**
 * Turning a request into a number, without keeping who made it.
 *
 * Counting returning visitors means recognising a browser you have seen
 * before, and the only thing every page view carries is the IP address. An IP
 * is personal data, so none is ever written down: it is hashed with a secret
 * salt the moment it arrives and only the hash is stored, under a key that
 * deletes itself after thirty quiet days.
 *
 * The salt is what makes that hash worth anything. Without one, a hash of an
 * IP is not anonymous at all — there are only four billion addresses, so
 * anybody holding the hashes could hash every address in an afternoon and read
 * them straight back. With a secret salt they cannot, and we never need to:
 * nothing in this codebase turns a hash back into an address, because nothing
 * needs to know which visitor it is looking at. Only how many there were, and
 * which countries they were in.
 *
 * What this cannot do is worth stating plainly. Phone networks put thousands
 * of people behind one address, and home addresses change on their own, so a
 * count of returning visitors is an estimate and always will be. It is a much
 * better estimate than none.
 */
import { kv } from "./kv";

const SALT_KEY = "convi:stats:salt";

/**
 * The salt, from the environment or from the store.
 *
 * Generated and kept on first use when nothing is configured, so this works
 * with no setup at all and still never uses a salt an outsider could guess. It
 * is read once per cold start rather than per request.
 */
let cachedSalt: Promise<string | null> | null = null;

export function visitorSalt(): Promise<string | null> {
  if (cachedSalt) return cachedSalt;

  cachedSalt = (async () => {
    const configured = import.meta.env.STATS_SALT;
    if (configured) return configured;
    if (!kv) return null;
    try {
      const existing = await kv.get<string>(SALT_KEY);
      if (existing) return existing;
      const fresh = crypto.randomUUID() + crypto.randomUUID();
      // NX: two cold starts racing here must end up with the same salt, or a
      // returning visitor would look new to whichever one lost.
      const won = await kv.set(SALT_KEY, fresh, { nx: true });
      return won ? fresh : ((await kv.get<string>(SALT_KEY)) ?? null);
    } catch {
      return null;
    }
  })();

  return cachedSalt;
}

/**
 * A short, stable, one-way name for this browser.
 *
 * The user agent joins the address so that a household or an office behind one
 * IP is not collapsed into a single visitor quite as eagerly. It is not
 * identification: two identical phones on the same network still land on the
 * same hash, which is the point — the hash is a tally mark, not a person.
 */
export async function visitorHash(ip: string, userAgent: string): Promise<string | null> {
  const salt = await visitorSalt();
  if (!salt) return null;

  const bytes = new TextEncoder().encode(`${salt}:${ip}:${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Two-letter country, from the edge. Vercel resolves it at the network, so the
 * address never has to be looked up — or held — by us.
 */
export function countryOf(request: Request): string {
  const code = request.headers.get("x-vercel-ip-country") ?? "";
  return /^[A-Z]{2}$/.test(code) ? code : "??";
}
