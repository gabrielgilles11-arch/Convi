# Architecture

Why the pieces sit where they do. The code says what it does; this says what
it was weighed against.

---

## Rendering: split by who is reading

| Route | Mode | Why |
| :--- | :--- | :--- |
| `/`, `/scenarios`, `/scenarios/[id]`, `/scenarios/[id]/words` | Prerendered | Read by search and answer engines. Static HTML, no runtime cost, no cold start. |
| `/practice` | Server-rendered | Gated when the paywall is on, and its deck must not ship in the bundle. |
| `/api/*`, `/stats` | Server-rendered | Need the request: an address, a cookie, a token. |

The split is the whole SEO strategy. Scenario pages carry the search-intent
titles, the answer-first blocks and the `LearningResource` / `BreadcrumbList`
schema; they are the front door. Practice is the product behind it and has no
reason to be crawlable.

One consequence worth knowing: **Astro middleware does not run for prerendered
pages**, since they are static files on a CDN. Site-wide analytics therefore
could not be middleware, which is why the usage beacon lives in the layout and
the request is read on the server side of an API route instead.

## Content: JSON in the repository

Three files, one per locale, plus a buzzword set. Not a CMS, and not a
database.

Content here is edited far less often than it is read, and a bad edit is a
learner being taught something wrong. Keeping it in the repository means a
content change is a pull request: reviewed like code, and run through the same
test suite — which is what catches a new line that happens to mean the same as
an existing one. A CMS would have bought editing convenience nobody needs and
given up the only safety net that matters.

`src/lib/quizItems.ts` flattens that JSON into `QuizItem`s. It is marked
**server-only**: it imports the content files, so anything importing it pulls
the whole deck. React islands import types and pure functions from
`quizTypes.ts` instead and get their data from `/api/quiz-items`.

## The quiz engine

`src/lib/quizTypes.ts` is the largest and most interesting file. It is pure —
no React, no fetch, no storage — which is why it is the part under test.

```
buildStages   deck        → ordered path, split into rounds
buildRound    stage       → questions, mixed forms, no adjacent twins
buildQuestion item        → one question in one of four forms
buildOptions  answer      → four options, exactly one defensible
tooAlike      two lines   → would offering both be a trick?
answersMatch  typed, real → is this right, notes and accents aside?
spreadOut     questions   → greedy pass, then a repair swap
```

Two rules drive most of the complexity:

**Exactly one option may be defensible.** Distractors come from the same deck,
so near-duplicates are the default failure, not the edge case. `buildOptions`
tries sources in order — same category first, same *subsection* last, because a
subsection is a ring of lines about one moment where several are often a fair
answer to the same situation — under guards tried as `both`, then `answer`,
then `none`. A small stage gives up guards rather than rendering a two-option
"multiple" choice.

**No question may answer the next one.** `spreadOut` places questions greedily,
then makes a repair pass, because taking the first question that fits can
strand a twin at the end next to the one question it cannot follow.

## Progress, and what stays on the device

Everything a learner accumulates — stages cleared, streak, mistake queue —
lives in `localStorage` and is never sent anywhere. There are no accounts, so
there is nothing to attach it to and no reason to want it.

The consequence is honest rather than hidden: clearing site data loses your
progress. For a free site with no login, that beat asking people to make an
account so a server could hold a number for them.

## Counting without identifying

Two things are worth knowing and neither needs a person's identity: does
anyone come back, and does anyone finish a round.

```
browser ──beacon (carries nothing)──▶ /api/stats ──▶ hash(salt + ip + ua)
                                          │
                                          ├─ views, per day and total
                                          ├─ visitors, once per day
                                          ├─ new vs returning
                                          └─ country, from the edge header
```

The beacon carries nothing on purpose: country and returning-status are read
from the request on the server, where a page cannot forge either. The hash is
never reversed, and there is no code here that could. See
[`src/lib/visitor.ts`](src/lib/visitor.ts) for why the salt is the load-bearing
part.

Rounds are the one signal the device reports about itself, and only as a
milestone crossed — `1`, `5`, `10`, `25`, `50` — once ever.

## Dormant payments

`src/lib/paywall.ts` exports a single boolean, in a module with no imports so
both runtimes can read it. `content.ts`, `/api/quiz-items`, `/api/entitlement`
and the two gate components all consult it.

With it `false` the site is entirely free. The Gumroad product, the HMAC-signed
entitlement cookie, the two-device limit and the ping webhook are all still
here and still correct. Reinstating is one line, not a revert.

## Failure modes, chosen deliberately

| When | What happens | Instead of |
| :--- | :--- | :--- |
| Redis unreachable | Rate limiting allows; counters no-op | 500 on signup and purchase checks |
| No `STATS_TOKEN` | `/stats` is a 404 | An open dashboard |
| No `GUMROAD_SELLER_ID` | No ping is honoured | Granting entitlement on a URL parameter |
| No TTS clips | Device voice reads the line | A silent speaker button |
| No voice at all | The button is not rendered | A control that does nothing |

The pattern: **fail open for counting, fail closed for access.** A dropped
metric is a shame. A wrongly granted entitlement, or a dashboard anyone can
read, is not.

## Things deliberately not done

- **No test runner in the browser.** The engine is pure; the UI is thin. Tests
  go where the logic is.
- **No FAQ schema.** Google deprecated FAQ rich results for most sites in 2026;
  emitting it now would be cargo cult.
- **No component library.** One designer, one product, a handful of screens.
- **No database.** Nothing needs to outlive a visit except counters, and
  counters are integers.
