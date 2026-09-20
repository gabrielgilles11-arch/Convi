/**
 * Which edition this browser was last reading.
 *
 * The home page is static and belongs to no edition, so the only way it can
 * open the right one is to ask the browser. Every edition page writes its slug
 * here as it renders; the hero reads it back and points its one button at that
 * language instead of making the reader choose again.
 *
 * Stored as the URL slug rather than the locale, because the only thing anyone
 * does with it is build a link, and a slug is already half of one. Spanish is
 * the empty string — it lives at the root paths — which is why every check
 * here is against `null`, never against falsiness.
 *
 * Client-safe: this file must never import ../lib/content, which pulls the
 * whole content JSON in behind it.
 */
export const LAST_LOCALE_KEY = "convi:last-locale:v1";

/** Called from every edition page, so the newest visit is the one remembered. */
export function rememberLocaleSlug(slug: string): void {
  try {
    window.localStorage.setItem(LAST_LOCALE_KEY, slug);
  } catch {
    // Private mode. The hero falls back to the default edition, which is
    // exactly what it did before this existed.
  }
}

/**
 * The slug last seen, or null if this browser has never opened an edition.
 *
 * Never trusted on its own: a stored value is a value from outside, and it
 * ends up in an href. Callers check it against the list of real slugs before
 * building anything with it.
 */
export function readLocaleSlug(): string | null {
  try {
    return window.localStorage.getItem(LAST_LOCALE_KEY);
  } catch {
    return null;
  }
}
