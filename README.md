# Try Convi

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Conversational Spanish, Swedish and German for people who are about to be in
the country. The lines you actually need at a bar, in a taxi, or looking for
the metro, rather than the ones a textbook opens with.

**Live:** [tryconvi.com](https://tryconvi.com)

Three editions ship: Spanish as spoken in Spain, Swedish as spoken in
Stockholm, and German. Every scenario is a real exchange — what you say, and
what comes back at you — and every target-language line can be played aloud.

---

## What is interesting in here

Not the CRUD. These are the problems that took real work:

**A multiple-choice question with two right answers cannot be answered.**
Distractors are drawn from the same deck as the answer, so sooner or later one
of them *is* the answer in different words: "A beer, please" against "A small
beer, please" are both what `¿Una caña porfa?` means. String equality does not
catch that. [`tooAlike`](src/lib/quizTypes.ts) tests two shapes of the failure —
one line containing all of another's words, and heavy overlap without
containment — while leaving genuine contrasts ("Draft, thanks" / "Bottle,
thanks") alone. Options are then built under tiered guards that are given up
one at a time, because a stage with three items still has to fill four boxes.

**Analytics that can count returning visitors without knowing who they are.**
The only thing every page view carries is an IP address, which is personal
data. It is hashed with a secret salt on arrival and only the hash is stored,
under a key that deletes itself after thirty quiet days. The salt is the part
that matters: unsalted, an IP hash is not anonymous at all — there are only
four billion addresses, so anyone holding the hashes could reverse them in an
afternoon. See [`src/lib/visitor.ts`](src/lib/visitor.ts).

**A paywall that can be switched off without being deleted.**
[`PAYWALL_ENABLED`](src/lib/paywall.ts) is one boolean in a dependency-free
module that both the server and the browser can read. Turning it off left the
Gumroad product, the signed entitlement cookie, the device limit and the
webhook entirely intact — so the decision is reversible in one line rather than
in a revert of forty commits.

**Speech that survives a network that cannot reach the model host.**
Lines are spoken from generated clips where they exist and the device's own
voice where they do not. Generating them needs Hugging Face, which the
development sandbox cannot reach — so [a GitHub Actions
workflow](.github/workflows/generate-audio.yml) does it on a runner and commits
the result back. The voice picker is scored by name, after discovering that
preferring `localService` voices reliably selected the *worst* voice on the
machine: on every desktop platform the local voices are the old ones.

---

## Architecture in one paragraph

Scenario pages are prerendered at build time, because they are what search
engines and answer engines read. Practice is server-rendered and pulls its
deck from `/api/quiz-items`, so the content never ships in the client bundle.
Content is authored as JSON per locale rather than in a CMS — it is edited far
less often than it is read, and keeping it in the repository means a content
change is reviewed like a code change and tested by the same suite.

Fuller notes in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Running it

```sh
npm install
cp .env.example .env   # every value is optional for local development
npm run dev            # http://localhost:4321
```

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Dev server |
| `npm test` | 57 tests over the quiz engine |
| `npm run test:watch` | The same, on change |
| `npx astro check` | Typecheck, including `.astro` files |
| `npm run build` | Production build |

Nothing needs a key to run. Without Redis the rate limiter and the usage
counters both fail open; without a TTS key the device voice reads the lines.
Every variable is listed with no values in [.env.example](.env.example).

---

## Tests

```
npm test
```

They run against the decks that actually ship, so a content edit that
reintroduces two interchangeable answers fails here rather than reaching a
learner — which is how the `¿Una caña porfa?` question got in front of someone
in the first place.

Each test was checked by breaking the thing it guards and confirming it went
red. Two of them turned out to be decorative and were rewritten: one compared
answers with an equality that could never catch a near-duplicate, and another
allowed a 2% clash rate against a real rate of 0.00%, so deleting the entire
separation pass still passed. An allowance nobody measured is indistinguishable
from no test at all.

---

## Stack

Astro 7 (SSR + prerendering, `@astrojs/vercel`) · React 19 islands ·
TypeScript, strict, no `any` · Upstash Redis · Vercel · Edge TTS / Google / Azure / Piper
TTS · Vitest

## Built with AI, and not quietly

Written solo, using Claude Code as a pair-programmer. I chose the architecture,
reviewed every change and rejected plenty; the commit history is unedited and
shows exactly who wrote what. The interesting parts above are the ones where
the first answer was wrong and the second was found by testing it.

## Licence

Two licences, because there are two kinds of work here.

- **Source code** — [MIT](LICENSE). Everything outside `content/` and
  `public/audio/`. Take it and build on it.
- **Language content** — [all rights reserved](LICENSE-CONTENT). The phrases,
  translations, scenarios and recordings are the product rather than the
  scaffolding, and they are not open source. Permission for teaching or
  research is genuinely available — ask.
