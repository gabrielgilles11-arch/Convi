import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { Locale } from "./content";

/**
 * One spelling for every URL: no trailing slash, except the root.
 *
 * Internal links have always been written without the slash, and the sitemap
 * and canonical tags used to add one. Google saw two live URLs per page, chose
 * the slashless one the links pointed at, and dropped the slashed ones the
 * sitemap declared as "Duplicate, Google chose different canonical than user".
 * `trailingSlash: "never"` in astro.config makes the server agree, and this
 * makes the canonical tags and schema agree with both.
 */
export function canonicalPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "/";
  return pathname.replace(/\/+$/, "");
}

export function canonicalUrl(pathname: string, site: URL | undefined): string {
  return new URL(canonicalPath(pathname), site).href;
}

/** Search engines cut titles around 60 characters and descriptions around 160. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

const CONTENT_FILE: Record<Locale, string> = {
  "es-ES": "content/es-ES.json",
  "sv-SE": "content/sv-SE.json",
  "de-DE": "content/de-DE.json",
};

const updatedCache = new Map<Locale, Date | null>();

/**
 * When an edition's content file last changed, from git, or null.
 *
 * This is the date shown as "Updated" on scenario pages and sent as lastmod in
 * the sitemap, so it has to be a real date or nothing. Two ways it would lie,
 * both answered with null rather than a guess:
 *
 * - No git at all (a runtime function, a tarball build): nothing to read.
 * - A shallow clone, which is how hosts usually build. If the file's last
 *   change is older than the clone's depth, `git log` reports the boundary
 *   commit instead, which is just whatever commit the history was cut at. A
 *   commit listed in .git/shallow is that boundary, so its date is not the
 *   file's date and is not used.
 */
export function contentUpdated(locale: Locale): Date | null {
  if (updatedCache.has(locale)) return updatedCache.get(locale)!;
  let result: Date | null = null;
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%H %cI", "--", CONTENT_FILE[locale]],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    const [hash, iso] = out.split(" ");
    if (hash && iso && !isShallowBoundary(hash)) {
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime())) result = date;
    }
  } catch {
    result = null;
  }
  updatedCache.set(locale, result);
  return result;
}

function isShallowBoundary(hash: string): boolean {
  try {
    const path = execFileSync("git", ["rev-parse", "--git-path", "shallow"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!existsSync(path)) return false;
    return readFileSync(path, "utf8").split("\n").includes(hash);
  } catch {
    // Unsure whether it is the boundary, so do not trust the date.
    return true;
  }
}

/** "October 27, 2026", the way an American reader writes a date. */
export function formatUpdated(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
