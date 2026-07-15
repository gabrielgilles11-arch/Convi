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
  "region": "madrid" | "barcelona",  // optional; renders a regional badge. Omit for pan-Spanish.
  "young": true,                     // optional; renders a "young" badge for youth/informal slang. Omit otherwise.
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
  "region": "madrid" | "barcelona",  // optional; renders a regional badge. Omit for pan-Spanish.
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

1. Create `content/{locale}.json` with the same `categories` structure,
   translated `es`/`en` pairs stay as `es`/`en` keys (the source language is
   always `es`, the gloss is always `en` — this doesn't change per file).
2. Keep every `id` identical to `es-ES.json` so progress tracking and quiz
   state (keyed by id) carries over across languages.
3. No component changes required — pages iterate over `categories` generically.
