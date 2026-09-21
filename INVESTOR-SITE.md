# Sending the site to an investor

Working notes for getting tryconvi.com ready to send. Written to be picked up
cold: everything needed to carry on is in here or named here.

## Where this stands

**Shipped.** The welcome card is gone (`51aa4bd`). A first-time visitor lands
on the practice path with the first stone one tap away, verified on a clean
browser profile. It was written for somebody who had just paid, and nobody
pays — the paywall has been off for months. Cut with it: the six-question
taster and its round builder, the intro mode and its flag, the replay button
on the progress panel, and the second set of scoring rules TestMode ran under.

**Proposed, not built.** The seven edits below. None of the marketing copy has
been touched: positioning is the founder's, and the numbers are not mine to
invent.

**Blocked on you.** Which three figures from `/stats` you are willing to
publish (rounds practised, visitors, countries). With those, edits 1–5 and the
live proof strip can be implemented in one pass.

## Measured against

- Sequoia, [Writing a Business Plan](https://sequoiacap.com/article/writing-a-business-plan):
  company purpose as one declarative sentence, then problem, solution, why now.
- a16z, [16 Startup Metrics](https://a16z.com/16-startup-metrics/) and the
  power user curve: engagement and retention, not registrations.
- Creandum: can the founder explain *how and why* an industry changes, and is
  there a path to category leadership.
- YC landing-page convention: a visitor understands the product in under ten
  seconds, ideally by seeing it rather than reading about it.

## The finding that matters most

The site argues against itself for this reader. "Human-written per country,
not machine-translated" appears on the home page, on About, and three more
times in the copy. To a traveller that is quality. To an investor it reads as
hand-made content that does not scale, which is the standard objection to
content businesses — and the site currently supplies the objection and no
answer.

The answer is already in the repo and invisible on the site: an authoring
schema, a generation pipeline, and 222 tests that enforce content quality as
invariants — no duplicate line across an edition, no two interchangeable
answers in one subsection, no situation without a reply, every deck sized for
a round. That is a content factory with a QA gate. A fourth language is a
pipeline run, not a hire. Said out loud, the objection becomes the moat.

## Metrics already collected, published nowhere

`/stats` is token-gated and tracks, per `src/lib/stats.ts`:

| Field | What it is |
| --- | --- |
| `fresh` / `returning` | first-time vs returning visitors — retention |
| `rounds` | rounds completed — the activity metric |
| `reached` | devices that ever hit 1 / 5 / 10 / 25 / 50 lifetime rounds |
| `countries` | visitor-days by country |
| `byLocale` | which of the three editions pulls |
| `days` | the above, by day, over a rolling window |

`reached` is a power user curve in raw form, which is one of the things a16z
looks for in consumer PMF. No analytics need building before this meeting.
The numbers need reading and three of them need publishing.

## Edits, ranked

1. **Hero as a declarative sentence.** Current headline is a category promise
   that Babbel could run tomorrow.
   - Now: *Learn how to speak like a local.*
   - Proposed: *Convi teaches travellers the 2,000 lines they'll actually use —
     and what the barman says back.*
2. **Product above the fold.** The paper-plane SVG holds the most valuable
   space on the site. A ten-second loop of a Talk Mode exchange out-argues
   every sentence on the page, and nobody currently sees the product without
   two clicks.
3. **Live proof strip under the hero.** Rounds practised, countries, lines.
   Read from the counters above so it cannot go stale.
4. **Why now.** Missing entirely, and there is a real one: translation made
   understanding free, so producing a sentence in the moment is the remaining
   bottleneck, and it is the thing the phone cannot do for you at a bar.
5. **Fix the email capture.** "We'll ping you the moment the app is ready"
   tells an investor the product does not exist, while a working one sits a
   scroll below. Reframe: the web app is live and free, the list is for mobile.
6. **Say something about money.** The site says free five times and "nothing to
   buy" three. The Gumroad flow and entitlement checks are built and switched
   off (`PAYWALL_ENABLED` in `src/lib/paywall.ts`). One honest line about the
   intended model beats silence.
7. **A founder line.** There is nobody on this site. Creandum and Sequoia both
   weight team heavily, and the ask is to back a person.

## The scalable process

Two senses, both wanted.

**For the pitch.** The factory framing above: schema, authored lines, test
suite, ship. A new language runs the pipeline against a known-good gate.

**For the repo.** Promote the throwaway audit scripts written during the
design pass into `npm run site-check`, so any investor or press send gets one
pass that fails loudly on regressions. The checks already written and proven:
colour contrast against WCAG AA, tap-target size and neighbour spacing, type
size floors, content integrity, conversation flow. That is the difference
between a one-off review and a standard.

## What a fresh session needs to know

- Deploys from `main`; a push there is a production build. See `AGENTS.md`.
- `npm test && npx astro check && npm run build` before any push to `main`.
- 222 tests currently pass.
- The paywall is off, so every gate and purchase path is dormant, not deleted.
- Design pass already shipped: WCAG AA contrast across the site, 44px tap
  targets, a 13px type floor (12px for uppercase tracked labels), and focus
  mode that drops the marketing header during a round.
- Still open from the design review, deliberately not done: dark mode
  (scrapped by request), onboarding, and the reward economy.
