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

## Talk: the conversations were already written

`/api/conversations` serves a third thing built from the same JSON. A dialogue
subsection — "Taxi / rideshare", "At the door" — is already eight consecutive
beats in one place: the line that opens each one, the lines you could answer
with, and what comes back. Walking it needs no model, and the only thing the
JSON does not say in a single field is which of those lines is whose.

`speaker` decides that, and resolving it is the whole of `conversations.ts`:

```
speaker: "them"   their question opens  →  answers are yours  →  likelyReply comes back
speaker: "you"    the question is yours →  answers are theirs →  likelyReply follows
```

The consequence is stated on the screen rather than hidden: **the conversation
does not branch.** Picking the bolder of two replies changes how you sound, not
what they say next, because the content has one next. Generating the others
would mean teaching unreviewed lines as if they were authored, which is the
trade the whole content model exists to refuse.

Only `exchanges` become conversations. `scenes` are separate moments written to
put one word each in context, so a transcript made of them would change the
subject every line.

## Progress, and what stays on the device

Everything a learner accumulates — stages cleared, streak, mistake queue —
lives in `localStorage` and is never sent anywhere. There are no accounts, so
there is nothing to attach it to and no reason to want it.

The consequence is honest rather than hidden: clearing site data loses your
progress. For a free site with no login, that beat asking people to make an
account so a server could hold a number for them.

One thing now leaves, and only for people who ask for it: see **Coming back**.

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

## Coming back

A reminder is a message sent to somebody who is not here, which is the one
thing the design above cannot do: it needs to know how to reach them, and that
they are away. Neither fact fits in their own browser.

So reminders, and only reminders, store something per person:

```
opt-in  ──▶ convi:rem:sub:<id>   push endpoint or email · edition · lastSeen
                                 lastSentAt · nudges sent since lastSeen
        ──▶ convi:rem:index      sorted set, scored by lastSeen
```

`<id>` is a UUID the browser generates. It is the only handle on the record and
nothing else is attached to it — no name, no progress, no answer history — and
because it is unguessable it can serve as the authorisation on an unsubscribe
link, which is how somebody opts out of a site they have no account on.

**Can we actually tell they stopped using it?** Yes, with one honest limit.
Every page fires a heartbeat — the reminder id, nothing else, at most once per
local day — so `lastSeen` is genuinely "last visit", not "last finished round";
somebody who reads scenarios all week is not away. The limit is that it is per
browser: clear site data and the id goes with it, so the heartbeats stop while
the visits continue. That is what the four-nudge cap and the one-click
unsubscribe in every message are for.

The heartbeat is deliberately **not** folded into the anonymous view beacon.
That one carries nothing and must stay that way — attaching a subscriber id to
the site counters would turn them into per-person analytics, which is the thing
`visitor.ts` exists to avoid.

`reminderPlan.ts` holds the decision and is pure, so it is the part under test:
four rungs at 2, 4, 8 and 16 days, never two inside 48 hours, reset by a single
visit, and the last one says out loud that it is the last. A nightly Vercel cron
asks it who is due and sends what it says. Push first where there is one — it
arrives now and spends no inbox goodwill — with email as the fallback, never a
second copy.

| Missing | What happens |
| :--- | :--- |
| No Redis | The opt-in card is never shown. Nothing is taken that cannot be stored. |
| No VAPID keys | Push is not offered; email still is. |
| No `CRON_SECRET` | `/api/reminders/run` is a 404. The one endpoint that can send mail is the one that must not be guessable. |
| No `ResendAPI` | Nudges are planned and not sent. The ladder does not advance on a failure. |

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
- **No offline cache.** There is a service worker, but only so that a push
  notification has something to be handled by when the tab is closed. Caching a
  three-edition content site would mean deciding what to keep and when it is
  stale, and a learner reading a phrase that was corrected a month ago is a
  worse failure than a page that needs a connection.
- **No database.** Nothing needs to outlive a visit except counters, the signup
  list, and reminder subscriptions — all of which are integers, a sorted set of
  addresses, and one small record per person who asked to be reminded. None of
  it is a schema, and none of it is on the read path of a page.
