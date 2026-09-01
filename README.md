# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Spoken lines

Every target-language line can be played back, from a clip where one exists and
from the visitor's own device voice where one doesn't. Device voices vary from
good to genuinely bad, so the clips are worth generating — once they are in
`public/audio/`, nobody hears a synthesiser again.

Generating them needs a Google Cloud key with the Text-to-Speech API enabled,
in `GOOGLE_TTS_API_KEY`. The whole catalogue is about 11,000 characters, which
sits inside Google's free monthly allowance at every voice tier.

```sh
# what voices Google currently offers, newest tier first
GOOGLE_TTS_API_KEY=... node scripts/generate-audio.mjs --list-voices --locale es-ES

# audition one: six lines, listen, repeat with another name
GOOGLE_TTS_API_KEY=... GOOGLE_VOICE_ES=es-ES-Studio-F \
  node scripts/generate-audio.mjs --locale es-ES --sample 6 --force

# then the whole edition
GOOGLE_TTS_API_KEY=... GOOGLE_VOICE_ES=es-ES-Studio-F \
  node scripts/generate-audio.mjs --locale es-ES
```

`--force` matters when comparing voices: without it, lines already on disk are
skipped and you hear the previous voice back. The run writes an `index.json`
beside the clips listing what it made; the app reads that one file to know what
exists, so a deck with no audio costs one request rather than a 404 per line.

Swedish goes to Azure rather than Google, with `AZURE_SPEECH_KEY` and
`AZURE_SPEECH_REGION` (the region the Speech resource was created in, like
`northeurope`). Google's Swedish voice is the one Maps reads directions in, and
every Chrome and Android device already falls back to it, so recording it would
buy nothing; Azure's `sv-SE-SofieNeural` is a true neural voice and the best
Swedish available anywhere. It is also what Edge reads Swedish pages in, so it
can be auditioned before a clip is generated. The free F0 tier covers 500,000
characters a month against a Swedish deck of about 1,800.

```sh
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=northeurope \
  node scripts/generate-audio.mjs --list-voices --locale sv-SE

AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=northeurope \
  node scripts/generate-audio.mjs --locale sv-SE
```

Both providers check the voice name exists before spending a request per line,
so a retired or mistyped name fails once, with the alternatives printed.

Commit the output — the clips are served statically, so there is no API key and
no per-play cost in production.
