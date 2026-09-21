# Sending the site to an investor

Working notes for getting tryconvi.com ready to send. Written to be picked up
cold: everything needed to carry on is in here or named here.

## Where this stands

**Shipped this pass.** Edits 1, 2 and 7 below, per the founder's call on the
last session's questions.

- *Hero headline kept, traveller said out loud.* "Learn how to speak like a
  local" stays: it is the founder's line and the promise. Who it is for now has
  its own full-bleed band under the marquee, at the second-largest type size on
  the page, because the only place the site said "traveller" was six words of
  grey text in the eyebrow.
- *The product is above the fold.* The paper-plane SVG is gone. In its place a
  Talk Mode exchange from the Spanish edition plays on a loop: the bartender
  opens, you produce a line, they come back. Built from `content/es-ES.json` at
  build time (`src/lib/heroDemo.ts`), so no Spanish is retyped into a template
  and a content edit that breaks a beat fails `npm test` rather than the page.
- *There is a person on the site.* A founder block on `/about`, under "Who
  made this", in the founder's own words: 40-plus countries, three languages,
  a dual degree in Business and Global Affairs with a minor in German from the
  School of Foreign Service at Georgetown. Placed there rather than on the home
  page at his request, one click from every page via the footer, which is where
  somebody who has decided they want to know who wrote this goes looking.
- *Counts are said, not recited.* Line counts read "over 500" rather than
  "943" in every sentence on the site (`roughLineCount`). Still computed from
  the content files, so still undriftable; rounded down, so never larger than
  what is there. The exact per-section figures stay in the `/about` section
  index, where they are a directory rather than a claim.
- *The page fills the window.* The site was a 960px column with 384px of empty
  page either side of it on a 16-inch laptop, and `main` inside that was 720px.
  Widths are now tokens in `Layout.astro` (`--shell-wide` 1600 for layout bands,
  `--shell-text` 800 for prose, `--shell-pad` a clamp from 16px to 48px) rather
  than five pixel numbers that disagreed. The header and footer take neither
  cap: they are the frame, so the wordmark sits at the window's edge rather
  than 320px into it. Vertical rhythm is clamps too, so the space between
  blocks grows with the window instead of staying at a laptop's measure.
  Verified from 320px to 2560px: no horizontal overflow at any width and the
  wordmark within 60px of the edge at every one.

**Shipped earlier.** The welcome card is gone (`51aa4bd`). A first-time visitor lands
on the practice path with the first stone one tap away, verified on a clean
browser profile. It was written for somebody who had just paid, and nobody
pays — the paywall has been off for months. Cut with it: the six-question
taster and its round builder, the intro mode and its flag, the replay button
on the progress panel, and the second set of scoring rules TestMode ran under.

**Proposed, not built.** Edits 3, 4, 5 and 6 below.

**Blocked on you.** Two things.

1. Which three figures from `/stats` you are willing to publish (rounds
   practised, visitors, countries). With those, edit 3, the live proof strip,
   goes in in one pass.
2. Nothing else. The founder paragraph is now his own.

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

1. **Who it is for, in big letters.** *Done, differently from the proposal.*
   The proposed replacement headline was declined: the headline stays "Learn
   how to speak like a local" and the traveller is emphasised in its own band
   below the marquee instead. Note for the pitch: the proposal said "2,000
   lines" and the content files say 943. The band reads the real count at build
   time, so no number on the page can be argued with.
2. **Product above the fold.** *Done, Spanish edition.* A Talk Mode exchange
   loops in the hero. Verified in Chromium: the card is the same height on the
   first frame as the last (no layout shift), it pauses off screen and in a
   hidden tab, and it renders as a complete, readable conversation with
   JavaScript off and under `prefers-reduced-motion`. Swedish and German would
   be the same component with a different locale; one edition was the point,
   two would be a language picker in a hero. The card plays one beat at a time
   in one place rather than reserving height for the whole conversation, which
   is what stopped the hero opening on one line of Spanish and four hundred
   pixels of nothing.
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
7. **A founder line.** *Done.* Creandum and Sequoia both weight team heavily,
   and the ask is to back a person. It lives on `/about` rather than the home
   page, by the founder's call: a visitor landing on the home page wants the
   product, and a bio between them and it is in the way. For the investor send
   this means linking `/about` directly rather than assuming they scroll to
   the footer.

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
- 231 tests currently pass.
- The paywall is off, so every gate and purchase path is dormant, not deleted.
- Design pass already shipped: WCAG AA contrast across the site, 44px tap
  targets, a 13px type floor (12px for uppercase tracked labels), and focus
  mode that drops the marketing header during a round.
- Still open from the design review, deliberately not done: dark mode
  (scrapped by request), onboarding, and the reward economy.
- Found while widening the layout, not fixed because it is nobody's ask yet:
  the header's two nav dropdowns are 22px tall and the `/about` section index
  links are 27px, against the 44px the design pass set for tap targets. Both
  predate this work.
