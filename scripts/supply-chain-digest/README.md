# Supply chain / transatlantic friction digest

A daily early-warning email: monitors a curated set of sources for the
mineral-supply-chain and transatlantic-friction beat, scores every item
against a fixed rubric, and mails the ranked result through Resend. Runs from
[`.github/workflows/supply-chain-digest.yml`](../../.github/workflows/supply-chain-digest.yml),
not from the Astro app — it has nothing to do with the site at tryconvi.com
beyond living in the same repo.

## Sources (`sources.mjs`)

| Source | Type | Authority |
| :--- | :--- | :--- |
| Federal Register — critical minerals | official API | 3 |
| Federal Register — defense procurement | official API | 3 |
| CSIS — analysis | RSS | 2 |
| GZERO Media (Eurasia Group) | RSS | 2 |
| China customs data | Google News proxy | 1 |
| EU Commission trade & minerals | Google News proxy | 1 |

China's customs releases and the EU Commission's press corner don't publish a
feed stable enough to hardcode, so those two are covered by targeted Google
News queries instead of a native feed. A source going stale doesn't take the
run down — `fetchSources.mjs` catches each one independently, and the digest
prints a health line naming what failed.

## The rubric (`rubric.mjs`)

Every dimension is a keyword or date check — deliberately, so it can be
recited and defended rather than trusted as a black box:

| Dimension | Range | What it measures |
| :--- | :--- | :--- |
| Mineral relevance | 0–4 | Critical-minerals keyword hits (title weighted 2x, body 1x) |
| Friction relevance | 0–4 | Transatlantic-friction keyword hits, same weighting |
| Source authority | 0–3 | Official (3) / think tank (2) / news proxy (1), from `sources.mjs` |
| Recency | 0–2 | 2 within 24h, 1 within 72h, 0 beyond |
| Magnitude | 0–2 | A hard number or a ban/restriction verb (2), a soft "considering" (1), neither (0) |

**Qualifies for the digest** when `mineral >= 3` OR `friction >= 3` OR
`total >= 6` — a strong signal on either half of the beat is enough alone;
two moderate signals together also clear the bar. Keeps the two halves of the
beat from crowding each other out, and keeps source authority + recency alone
from admitting something with no real content match.

Qualifying items are ranked by total score, the top 12 are mailed, and only
those are marked "seen" — one bumped by the cap today is still eligible
tomorrow rather than silently dropped.

## Scheduling and DST

Cron is UTC and can't track the CET/CEST switch on its own, so the workflow
fires twice a day (06:00 and 07:00 UTC) and `index.mjs` checks the actual
Europe/Berlin hour before doing anything — only the firing where it reads 8am
sends; the other is a silent no-op. No yearly cron edit required.

## Running it

```sh
npm run digest:dry   # fetches, scores, prints the digest — no secrets needed
npm run digest       # sends for real; needs the env vars below
```

## Required GitHub repo secrets

Set these under Settings → Secrets and variables → Actions:

- `RESEND_API_KEY` — a Resend API key.
- `RESEND_FROM` — sender address. `onboarding@resend.dev` works with no
  domain setup, but Resend's shared sandbox address can only deliver to the
  email address the Resend account itself is registered with.
- `RESEND_TO` — where the digest goes.

## Extending

- **State**: `state/seen.json` is de-dup memory (14-day retention), committed
  back by the workflow. Delete it to reset.
- **Adding a source**: add an entry to `sources.mjs`; `type: "rss"` handles
  both RSS 2.0 and Atom, `type: "federal-register"` expects the
  `documents.json` shape.
- **LLM summarization**: out of scope for now — the rubric alone decides
  inclusion and ranking, no API key required. A "why this matters" sentence
  per item could be layered on top later without changing what qualifies.
