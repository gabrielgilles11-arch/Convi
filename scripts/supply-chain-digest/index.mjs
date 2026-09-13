#!/usr/bin/env node
/**
 * Daily mineral-supply-chain / transatlantic-friction digest.
 *
 * Fetches the curated sources, scores every item against the rubric in
 * rubric.mjs, keeps what qualifies, and emails the ranked result through
 * Resend. Meant to run once a day from CI (see
 * .github/workflows/supply-chain-digest.yml) — this file has no server, no
 * persistence beyond the seen-items file, and no state between runs besides
 * that file.
 *
 * The schedule fires twice a day in UTC, once for CET and once for CEST,
 * because a fixed cron can't itself track the DST switch. Only the run
 * whose Europe/Berlin clock actually reads 8am sends anything; the other is
 * a silent no-op. Pass --force to skip that check (used by workflow_dispatch
 * for testing) and --dry-run to skip sending and print the digest instead.
 *
 *   node scripts/supply-chain-digest/index.mjs [--force] [--dry-run]
 */
import { SOURCES } from "./sources.mjs";
import { fetchAllSources } from "./fetchSources.mjs";
import { scoreItem, isQualified } from "./rubric.mjs";
import { hashItem, loadSeen, pruneAndSave } from "./state.mjs";
import { buildDigestHtml, buildDigestText } from "./render.mjs";
import { sendDigest } from "./send.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const MAX_ITEMS = 12;

function isDigestHour(now) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(now));
  return hour === 8;
}

async function main() {
  const now = new Date();

  if (!force && !isDigestHour(now)) {
    console.log(`Not the scheduled hour in Europe/Berlin (currently ${now.toISOString()}). Skipping.`);
    return;
  }

  const { items, health } = await fetchAllSources(SOURCES);
  console.log(`Fetched ${items.length} items across ${health.filter((h) => h.ok).length}/${health.length} sources.`);

  const seen = loadSeen();
  const scoredItems = items
    .map((item) => ({ item, hash: hashItem(item), scored: scoreItem(item, item.authority, now) }))
    .filter(({ hash }) => !seen[hash])
    .filter(({ scored }) => isQualified(scored));

  scoredItems.sort((a, b) => b.scored.total - a.scored.total);
  const rankedEntries = scoredItems.slice(0, MAX_ITEMS);
  const ranked = rankedEntries.map(({ item, scored }) => ({ item, scored }));

  const dateLabel = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", dateStyle: "full" }).format(now);
  const html = buildDigestHtml({ dateLabel, ranked, health });
  const text = buildDigestText({ dateLabel, ranked, health });

  if (dryRun) {
    console.log(text);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  const to = process.env.RESEND_TO;
  if (!apiKey || !to) throw new Error("RESEND_API_KEY and RESEND_TO are required to send (use --dry-run to skip sending).");

  const subjectCount = ranked.length > 0 ? `${ranked.length} development${ranked.length === 1 ? "" : "s"}` : "quiet day";
  await sendDigest({ apiKey, from, to, subject: `Supply chain / friction digest — ${subjectCount} — ${dateLabel}`, html, text });
  console.log(`Sent digest with ${ranked.length} item(s).`);

  // Only the items actually mailed are marked seen — one cut by MAX_ITEMS
  // today should still be eligible tomorrow, not silently dropped forever.
  pruneAndSave(seen, rankedEntries.map(({ hash }) => hash), now);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
