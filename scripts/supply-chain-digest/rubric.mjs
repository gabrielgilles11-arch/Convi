/**
 * The scoring rubric: how a headline earns a place in the digest.
 *
 * Every dimension is a plain keyword or date check on purpose — the point of
 * this tool is a rubric that can be recited and defended, not a black box.
 * Each score is capped independently, then summed, so one very keyword-dense
 * item cannot dominate every dimension at once.
 */

/** Weighted 2x in the title, 1x in the body — a headline-level hit is the stronger signal. */
function keywordScore(title, body, keywords, cap) {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (t.includes(kw)) hits += 2;
    else if (b.includes(kw)) hits += 1;
  }
  return Math.min(cap, hits);
}

const MINERAL_KEYWORDS = [
  "critical mineral",
  "rare earth",
  "lithium",
  "cobalt",
  "nickel",
  "graphite",
  "gallium",
  "germanium",
  "antimony",
  "tungsten",
  "neodymium",
  "dysprosium",
  "manganese",
  "battery material",
  "permanent magnet",
  "mineral supply chain",
  "critical raw material",
];

const FRICTION_KEYWORDS = [
  "tariff",
  "export control",
  "export ban",
  "export restriction",
  "sanction",
  "cbam",
  "inflation reduction act",
  "de-risking",
  "derisking",
  "decoupling",
  "outbound investment screening",
  "cfius",
  "trade war",
  "retaliat",
  "countervailing duty",
  "anti-dumping",
  "critical raw materials act",
  "friend-shoring",
  "national security review",
  "entity list",
  "investment screening",
  "transatlantic",
  "trade tension",
];

const MAGNITUDE_HARD = [/%/, /[$€]\s?\d/, /\bbillion\b/, /\bmillion\b/, /\bban(?:ned|s)?\b/, /\brestrict/, /\bquota\b/, /\blicense requirement/];
const MAGNITUDE_SOFT = [/\bplans? to\b/, /\bconsider/, /\bpropos/, /\bweigh(?:s|ing)?\b/];

/** 2 within a day, 1 within three days, 0 beyond — feeds routinely backfill older items. */
function recencyScore(publishedAt, now) {
  if (!publishedAt) return 0;
  const ageHours = (now.getTime() - publishedAt.getTime()) / 3_600_000;
  if (ageHours <= 24) return 2;
  if (ageHours <= 72) return 1;
  return 0;
}

function magnitudeScore(text) {
  const lower = text.toLowerCase();
  if (MAGNITUDE_HARD.some((re) => re.test(lower))) return 2;
  if (MAGNITUDE_SOFT.some((re) => re.test(lower))) return 1;
  return 0;
}

/**
 * Scores one item. `sourceAuthority` (0-3) comes from the source definition:
 * 3 official/regulatory, 2 think tank, 1 general-news proxy.
 */
export function scoreItem(item, sourceAuthority, now = new Date()) {
  const title = item.title ?? "";
  const body = item.summary ?? "";
  const text = `${title} ${body}`;

  const mineral = keywordScore(title, body, MINERAL_KEYWORDS, 4);
  const friction = keywordScore(title, body, FRICTION_KEYWORDS, 4);
  const authority = Math.max(0, Math.min(3, sourceAuthority));
  const recency = recencyScore(item.publishedAt, now);
  const magnitude = magnitudeScore(text);
  const total = mineral + friction + authority + recency + magnitude;

  const tags = [];
  if (mineral > 0) tags.push("minerals");
  if (friction > 0) tags.push("friction");

  return { mineral, friction, authority, recency, magnitude, total, tags };
}

/**
 * A strong signal on either half of the beat qualifies alone; two moderate
 * signals together also do. Keeps the digest from either axis crowding out
 * the other, or from admitting something that just happens to score well on
 * source authority and recency with no real content match.
 */
export function isQualified(scored) {
  return scored.mineral >= 3 || scored.friction >= 3 || scored.total >= 6;
}
