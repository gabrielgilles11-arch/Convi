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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
