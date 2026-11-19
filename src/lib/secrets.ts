import crypto from "node:crypto";

/**
 * Whether a secret someone sent matches the one we hold, in constant time.
 *
 * `===` on strings returns at the first differing character, so the time it
 * takes leaks how much of a guess was right. Over a network that is noisy, but
 * these secrets gate a paid entitlement, the business numbers and a route that
 * sends mail, and the fix costs nothing. Both sides are hashed first so the
 * comparison also says nothing about the secret's length.
 *
 * An unset or empty expected value never matches: an unset secret must never be
 * the same thing as an open door.
 */
export function secretMatches(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (typeof expected !== "string" || expected.length === 0) return false;
  if (typeof given !== "string") return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
