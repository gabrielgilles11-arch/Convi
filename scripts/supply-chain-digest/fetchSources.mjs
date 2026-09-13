/**
 * Turns each source definition into a flat list of normalized items:
 * { sourceId, sourceName, authority, title, link, summary, publishedAt }.
 *
 * A single source failing (a renamed feed path, a timeout, a 404) must not
 * take the whole run down, so every fetch is caught individually and
 * reported in `health` instead of thrown — the digest ends up saying "3 of 6
 * sources responded" rather than never arriving at all.
 */
import { XMLParser } from "fast-xml-parser";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "Convi-Supply-Chain-Digest/1.0 (+https://tryconvi.com)";

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(text) {
  return (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** Handles both RSS 2.0 (<item>) and Atom (<entry>) shapes. Exported for testing without a network call. */
export function parseFeed(xmlText) {
  const doc = xmlParser.parse(xmlText);
  const rssItems = asArray(doc?.rss?.channel?.item);
  if (rssItems.length > 0) {
    return rssItems.map((item) => ({
      title: stripHtml(item.title),
      link: typeof item.link === "string" ? item.link : (item.link?.["@_href"] ?? ""),
      summary: stripHtml(item.description ?? item["content:encoded"] ?? ""),
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }));
  }

  const atomEntries = asArray(doc?.feed?.entry);
  return atomEntries.map((entry) => ({
    title: stripHtml(entry.title?.["#text"] ?? entry.title),
    link: typeof entry.link === "string" ? entry.link : (asArray(entry.link)[0]?.["@_href"] ?? ""),
    summary: stripHtml(entry.summary?.["#text"] ?? entry.summary ?? entry.content?.["#text"] ?? entry.content ?? ""),
    publishedAt: entry.published || entry.updated ? new Date(entry.published ?? entry.updated) : null,
  }));
}

export function parseFederalRegister(json) {
  return (json.results ?? []).map((doc) => ({
    title: doc.title ?? "",
    link: doc.html_url ?? "",
    summary: doc.abstract ?? "",
    publishedAt: doc.publication_date ? new Date(doc.publication_date) : null,
  }));
}

async function fetchOneSource(source) {
  const res = await fetchWithTimeout(source.url);
  if (source.type === "federal-register") {
    return parseFederalRegister(await res.json());
  }
  return parseFeed(await res.text());
}

/** Returns { items, health } — health lists which sources succeeded and how many items each returned. */
export async function fetchAllSources(sources) {
  const items = [];
  const health = [];

  await Promise.all(
    sources.map(async (source) => {
      try {
        const raw = await fetchOneSource(source);
        for (const entry of raw) {
          if (!entry.title || !entry.link) continue;
          items.push({ ...entry, sourceId: source.id, sourceName: source.name, authority: source.authority });
        }
        health.push({ id: source.id, name: source.name, ok: true, count: raw.length });
      } catch (err) {
        health.push({ id: source.id, name: source.name, ok: false, error: err.message });
      }
    }),
  );

  return { items, health };
}
