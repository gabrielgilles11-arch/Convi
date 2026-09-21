## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Shipping

The site deploys from `main`. A push there is a production build, and
tryconvi.com picks it up a minute or so later. A feature branch deploys
nowhere, so work sitting on one is not shipped, however finished it looks.

Every change ends the same way: push the feature branch, then merge it into
`main` and push that, so what was built is on the site.

Run all three before any push to `main`. They are what CI runs, and a red
`main` is a broken tryconvi.com:

```
npm test && npx astro check && npm run build
```

## Writing copy

**American English, everywhere a visitor can read it.** Color, center, traveler,
practice (noun and verb), license, liter, realize, recognize, neighbor, behavior,
toward. The pages, the components and the English half of every content file are
standardized. One internal identifier is deliberately left alone: `normaliseLang`
in `components/quiz/speech.ts`, which is code rather than copy.

Watch the boundary between the two. A blanket pass over `.astro` and `.tsx`
renamed a property *access* in `pages/stats.astro` while the interface
declaring it lived in `lib/stats.ts` and was out of scope, which typechecks as
an error and builds fine, because `astro build` does not typecheck. `astro
check` is what catches it. Read its count carefully: it prints `1 error`,
singular, so a grep for "errors" silently passes a broken tree.

When editing `content/*.json`, convert only the English-bearing fields: `en`,
`notes`, `note`, `gloss`, `blurb`, `heading`, `heardIn`, `title`, `description`.
Never `es` or `term` — those hold the Spanish, Swedish or German line itself,
and `es` is the key the schema uses for the target language in all three
editions, not just the Spanish one.

**No em dashes in user-facing copy.** A colon, a comma or a full stop instead.
They are fine in code comments.

**Never type a count into copy.** Read it from the content files, the way
`index.astro` and `about.astro` do, so it cannot go stale. In a sentence, say it
through `roughLineCount` ("over 500") rather than to the digit: an exact figure
invites the reader to audit it and changes on the next content edit. Exact
figures belong in the `/about` section index, where they describe a list.

## Layout

Widths are tokens on `:root` in `layouts/Layout.astro`. Use them; do not add
another pixel number.

- `--shell-wide` (1600px) for bands that are layout: the hero, the section grids.
- `--shell-text` (800px) for anything that is a paragraph read top to bottom.
  Prose deliberately does not get the wide token. A 1,200px line is harder to
  read, not easier.
- `--shell-pad` the side gutter, clamped from 16px to 48px. Never below 16px.

The header and footer take neither cap. They are the frame rather than the
content, so the wordmark sits at the window's edge.

Vertical measures are clamps, not fixed rems. A band that is generous on a
laptop is cramped on a 27-inch monitor if the space between blocks stays put
while the columns widen.

Standing constraints from the design pass: WCAG AA contrast, 44px tap targets,
a 13px type floor (12px only for uppercase tracked labels), and no horizontal
overflow between 320px and 2560px.

## Checking front-end work

Chromium and Playwright are available. A change to layout or to anything that
animates is not done until it has been driven in a browser, not just built:

- No horizontal overflow across the width range, 320px to 2560px.
- For anything animated: element and document heights constant across a full
  loop, so nothing on the page shifts.
- The three fallbacks, each separately: JavaScript disabled,
  `prefers-reduced-motion: reduce`, and scrolled off screen or in a hidden tab.
  A looping hero is the easiest place on a site to hide a bug nobody reports.

`npm run preview` does not work under the Vercel adapter. Use `astro dev`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
