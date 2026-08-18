# Convi Content Schema

One JSON file per language (e.g. `es-ES.json`). Components must read only from
this shape — never hardcode language strings — so adding a new language later
(e.g. `fr-FR.json`) requires zero component changes.

## Top level

```
{
  "language": "es-ES",
  "meta": { "sourceTitle": string, "tagline": string, "region": string },
  "categories": Category[]
}
```

## Category

Each category is one of the 7 top-level sections from the source content
(Beer/Food, Starting a Convo, Slang, Cuss Words, Flirting, Getting Around,
Restaurant). There are two category `type`s — keep both, don't force one
shape onto the other:

```
{
  "id": string,           // slug, e.g. "beer-food"
  "order": number,        // display order, 1-7
  "title": string,
  "icon": string,         // single emoji, used as a visual tag
  "type": "dialogue" | "phrasebook",
  "description": string,
  "note": { "es": string|null, "en": string|null } | null,  // optional callout, phrasebook only
  "subsections": Subsection[]
}
```

### `type: "dialogue"` subsections

Used for categories with a real back-and-forth: Beer/Food, Starting a Convo,
Getting Around, Restaurant. A subsection groups related exchanges (e.g.
"Taxi" vs "Metro" inside Getting Around). `title` is `null` when a category
has no sub-grouping (single flat list of exchanges).

```
{
  "id": string,
  "title": string | null,
  "exchanges": Exchange[]
}
```

**Exchange** — the core learning unit for dialogue categories:

```
{
  "id": string,                    // unique across the whole file
  "question": { "es": string, "en": string },
  "answers": Array<{ "es": string, "en": string }>,   // 1-2 model-answer variants; can be empty []
  "likelyReply": { "es": string, "en": string } | null, // what the local says back; null if the exchange has no reply (e.g. a farewell)
  "notes": string,                 // slang/regional/usage notes; "" if none
  "difficulty": "easy" | "medium" | "hard",
  "region": "madrid" | "barcelona" | "stockholm" | "bayern",  // optional; renders a regional badge. Omit for pan-regional.
  "young": true,                     // optional; renders a "young" badge for youth/informal slang. Omit otherwise.
  "women": true,                     // optional; renders a "women" badge for women's-safety content (creeps, harassment). Omit otherwise.
  "quizQuestions": []              // populated in Step 3
}
```

Some `beer-food` and `flirting`-style subsections also carry a `"type": "tips"`
list instead of exchanges — short natural-sounding phrases with no Q/A shape:

```
{
  "id": string,
  "title": string,
  "type": "tips",
  "items": Array<{ "es": string, "en": string }>
}
```

### `type: "phrasebook"` subsections

Used for Slang, Cuss Words, Flirting — flat phrase lists, no Q/A/reply shape.

```
{
  "id": string,
  "title": string,
  "phrases": Phrase[]
}
```

**Phrase**:

```
{
  "id": string,          // unique across the whole file
  "es": string,
  "en": string,           // translation or usage note
  "difficulty": "easy" | "medium" | "hard",
  "region": "madrid" | "barcelona" | "stockholm" | "bayern",  // optional; renders a regional badge. Omit for pan-regional.
  "young": true,                     // optional; renders a "young" badge for youth/informal slang. Omit otherwise.
  "quizQuestions": []     // populated in Step 3
}
```

## `quizQuestions` (populated in Step 3)

Every exchange and every phrase carries its own `quizQuestions` array. Convi's
quiz mode asks "what would they say back?" (dialogue) or "what does this mean?"
(phrasebook) with **one correct answer per question**, not multiple correct
variants — the quiz engine will auto-generate distractors from sibling items
in the same category if this array is empty.

```
{
  "id": string,
  "prompt": string,
  "correctAnswer": string,
  "distractors": string[]   // 3, pulled from sibling exchanges/phrases if not authored
}
```

## Adding a new language

Live locales: `es-ES` (Spanish/Spain), `sv-SE` (Swedish/Stockholm),
`de-DE` (German/Germany + Bayern).

1. Create `content/{locale}.json` with the same structural shape. The
   `es`/`en` keys stay as-is: **`es` always holds the source language of that
   file** (Swedish in `sv-SE.json`, German in `de-DE.json`) and `en` is always
   the English gloss. The key is not renamed per locale so every component can
   read one shape.
2. **Namespace every `id` with the locale prefix** (`sv-beer-food`,
   `de-flirt-01`). Editions are independent bodies of content, not translations
   of each other — Swedish has 7 categories, German has 8 including Bayern
   slang, Spanish has 13. Progress is keyed by item id in localStorage, so
   sharing ids across languages would make marking a Spanish card "Got it"
   silently mark an unrelated Swedish one. Ids must be unique across *all*
   locale files.
3. Register it in `src/lib/content.ts`: import the file, add it to `FILES`, and
   add a `LOCALES` entry with its URL `slug`, `language`, `flag`, `accent`
   colour and `region`.
4. Add its premium category ids to `PREMIUM_CATEGORY_IDS` in the same file.
   One purchase unlocks every language, so this is a single flat set.
5. If it introduces a new `region` value, add it to the `Region` union and add
   a `.tag--{region}` style plus the badge markup in
   `src/pages/[...lang]/scenarios/[id].astro`.

No page changes are needed — `src/pages/[...lang]/` serves every edition from
one set of templates. Spanish uses an empty slug so it keeps its original,
already-indexed URLs (`/scenarios`, `/practice`); others are prefixed
(`/sv/scenarios`, `/de/practice`).

## Paywall

Practice is paywalled for **every** language. Quiz data is never bundled into
client JS — it comes from `GET /api/quiz-items?locale=…`, which verifies the
signed entitlement cookie server-side and returns 403 otherwise. `quizItems.ts`
is server-only for this reason; client components import types and
`buildOptions` from `quizTypes.ts`. Premium scenario pages are SSR and omit
locked content from the HTML entirely.
