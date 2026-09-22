#!/usr/bin/env node
/**
 * Generates one audio file per spoken line, once, at author time.
 *
 * All three editions together are ~52k characters — Spanish 20k, German 17k,
 * Swedish 16k — which is a rounding error against a monthly free tier and a
 * couple of dollars if it ever billed. So this is a build-time job, not a
 * runtime service: output is committed and served statically, and there is no
 * API key in production, no per-user cost and no latency.
 *
 * Providers, per the chosen split:
 *   es-ES        -> Google Cloud Text-to-Speech, Studio (needs GOOGLE_TTS_API_KEY)
 *   de-DE, sv-SE -> Google Cloud Text-to-Speech, Chirp 3: HD (same key)
 *
 * Azure and Piper are still here and still work; they are one flag away
 * (`--engine azure`, `--engine piper`) rather than the default for any locale.
 *
 * Idempotent: a line whose file already exists is skipped, so re-running after
 * adding content only synthesises the new lines. Pass --force to redo all.
 *
 *   node scripts/generate-audio.mjs [--locale sv-SE] [--force] [--dry-run]
 *   node scripts/generate-audio.mjs --locale sv-SE --audition   # pick a voice
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_ROOT = path.join(ROOT, "public", "audio");

const args = process.argv.slice(2);
const only = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const listOnly = args.includes("--list-voices");
// Renders a few real lines in every female voice for the locale, so the choice
// is made by ear rather than by reading names. See `audition` below.
const auditionOnly = args.includes("--audition");
// Which synthesiser to use, when it shouldn't be the locale's default. Piper
// is the one that needs no account, so it is the one a stopgap runs on.
const engine = args.includes("--engine") ? args[args.indexOf("--engine") + 1] : null;
// Auditioning a voice shouldn't cost the whole deck. `--sample 6` does the
// first six lines only, which is enough to hear what a voice is like.
const sample = args.includes("--sample") ? Number(args[args.indexOf("--sample") + 1]) : 0;

/**
 * Piper voices per locale, used when `--engine piper` overrides the default.
 *
 * Piper is the free path and the only one that needs no account at all: the
 * models are open-licensed, run offline, and `python3 -m piper.download_voices`
 * fetches one. Quality sits between a good device voice and Azure's neural
 * tier — worth having while a key isn't, and worth replacing when one is.
 */
const PIPER_VOICES = {
  "sv-SE": process.env.PIPER_SV_MODEL ?? "sv_SE-nst-medium",
  "es-ES": process.env.PIPER_ES_MODEL ?? "es_ES-sharvard-medium",
  "de-DE": process.env.PIPER_DE_MODEL ?? "de_DE-thorsten-medium",
};

/** Where download_voices puts them, and where -m looks. Never committed. */
const VOICE_DIR = process.env.PIPER_VOICE_DIR ?? path.join(ROOT, ".piper-voices");

/**
 * Azure voices per locale, used when `--engine azure` overrides the default.
 *
 * Swedish used to be here by default, on Sofie. Chirp 3: HD took that slot, but
 * Sofie is still the best second opinion on a Swedish line and Azure's free
 * tier still covers the whole deck, so the path stays one flag away rather than
 * deleted: `--engine azure --locale sv-SE --force --sample 6` auditions it.
 */
const AZURE_VOICES = {
  "sv-SE": process.env.AZURE_VOICE_SV ?? "sv-SE-SofieNeural",
  "de-DE": process.env.AZURE_VOICE_DE ?? "de-DE-KatjaNeural",
  "es-ES": process.env.AZURE_VOICE_ES ?? "es-ES-ElviraNeural",
};

function providerFor(locale) {
  const base = PROVIDERS[locale];
  if (!base || !engine) return base;

  if (engine === "azure") {
    const voice = AZURE_VOICES[locale];
    return voice ? { provider: "azure", voice, languageCode: locale } : base;
  }

  if (engine !== "piper") return base;

  const name = PIPER_VOICES[locale];
  if (!name) return base;
  // A bare name resolves to the file download_voices writes; a path is taken as
  // given, so an already-downloaded model can be pointed at directly.
  const model = name.endsWith(".onnx") ? name : path.join(VOICE_DIR, `${name}.onnx`);
  return { provider: "piper", model, voiceName: name };
}

/**
 * Voice choices. Google names are stable; Piper needs a downloaded .onnx.
 *
 * Google keeps several generations of voice live at once and they do not sound
 * alike: Chirp3-HD is the current tier, Studio the one before it, then Neural2,
 * and Standard is concatenative and shows it. Which one suits a deck of short
 * spoken lines is a matter of taste, so every voice can be overridden from the
 * environment — generate a few lines with one, listen, keep the one you like:
 *
 *   GOOGLE_VOICE_DE=de-DE-Chirp3-HD-Leda node scripts/generate-audio.mjs \
 *     --locale de-DE --force --sample 6
 *
 * `--force` matters when comparing: without it, lines already on disk are
 * skipped and you would hear the old voice back.
 *
 * Chirp 3: HD ships the same base eight in every locale it supports — Aoede,
 * Charon, Fenrir, Kore, Leda, Orus, Puck and Zephyr, four female and four male
 * — plus a wider roster since. A name that works for German works for Swedish
 * with the language code swapped.
 *
 * German and Swedish are both on Aoede, female, and that is the choice rather
 * than a placeholder: one voice across both editions and every surface, so a
 * learner hears the same person in Talk Mode, in practice and on the scenario
 * page. `--audition` is there to change it — it renders the same few lines in
 * every female voice the API lists for a locale — but nothing downstream is
 * waiting on that. Swap the name here and re-run with --force.
 */
const PROVIDERS = {
  // Spanish stays on Studio. It is the voice the hero demo and every existing
  // Spanish clip were recorded in, and re-cutting a whole edition to match the
  // other two is a separate decision from adopting Chirp for them.
  "es-ES": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_ES ?? "es-ES-Studio-F",
    languageCode: "es-ES",
  },
  "de-DE": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_DE ?? "de-DE-Chirp3-HD-Aoede",
    languageCode: "de-DE",
  },
  // Swedish came off Azure's Sofie for this. Sofie is a good voice, but a
  // second provider is a second account, a second key and a second free tier to
  // watch, and Chirp 3: HD is the first Google Swedish worth having — the old
  // one was the Maps directions voice that every Chrome and Android device
  // already falls back to, which is exactly what recording clips is meant to
  // improve on. `--engine azure` still reaches Sofie for a comparison.
  "sv-SE": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_SV ?? "sv-SE-Chirp3-HD-Aoede",
    languageCode: "sv-SE",
  },
};

/**
 * Every line worth hearing, with a stable id. Fill-in slots are authored
 * content, not missing text, so they are spoken as a short pause rather than
 * read out as "underscore" or "BELOPP".
 */
function spokenLines(locale) {
  const data = JSON.parse(readFileSync(path.join(ROOT, "content", `${locale}.json`), "utf8"));
  const lines = [];
  const push = (id, text) => {
    if (text && text.trim()) lines.push({ id, text: text.trim() });
  };

  for (const category of data.categories) {
    for (const sub of category.subsections ?? []) {
      // `scenes` are practice-only but just as spoken: the answer drawer reads
      // the line back to you there the same way the scenario page does.
      for (const ex of [...(sub.exchanges ?? []), ...(sub.scenes ?? [])]) {
        push(`${ex.id}-q`, ex.question?.es);
        push(`${ex.id}-r`, ex.likelyReply?.es);
        (ex.answers ?? []).forEach((a, i) => push(`${ex.id}-a${i}`, a.es));
      }
      for (const p of sub.phrases ?? []) push(p.id, p.es);
      (sub.items ?? []).forEach((t, i) => push(`${sub.id}-tip${i}`, t.es));
    }
  }
  return lines;
}

/**
 * Editions that record only the first of several ways to say a line.
 * Mirrors SPEAKS_ONE_ALTERNATIVE in src/components/quiz/speech.ts — the clips
 * and the fallback voice have to say the same thing.
 */
const SPEAKS_ONE_ALTERNATIVE = new Set(["sv-SE"]);

/**
 * What actually gets sent to the synthesiser.
 *
 * " / " with spaces around it separates two ways of saying the same thing, and
 * a clip that says both has the voice repeat itself. A slash without spaces
 * joins alternatives inside one phrase and becomes a beat, as do fill-in slots.
 */
function speakable(text, locale) {
  let line = text;
  if (SPEAKS_ONE_ALTERNATIVE.has(locale)) {
    const [first] = text.split(/\s+\/\s+/);
    if (first?.trim()) line = first;
  }

  return line
    .replace(/_{2,}/g, ", ")          // "Son __ euros." -> a beat, not "underscore"
    .replace(/\[[^\]]+\]/g, ", ")     // same for [BELOPP] / [STATION]
    .replace(/\s*\/\s*/g, ", ")       // "Links/rechts" -> a beat between them
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The voices Google will actually accept for a language, newest tier first.
 *
 * Worth a request before spending 300 of them: a voice name that has been
 * renamed or retired fails on every single line, and the 400 that comes back
 * says only "voice not found" among a wall of otherwise identical output. This
 * turns that into one clear message naming what *is* available, which also
 * saves reading a docs page to find out what changed.
 */
async function listGoogleVoices(languageCode) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY is not set");

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/voices?key=${key}&languageCode=${languageCode}`
  );
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new Error(
      `Google rejected the key (${res.status}). Check GOOGLE_TTS_API_KEY, and that the ` +
        "Text-to-Speech API is enabled for that project."
    );
  }
  if (!res.ok) throw new Error(`Google TTS voices ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const { voices = [] } = await res.json();
  const tier = (name) =>
    /Chirp3-HD/i.test(name) ? 0
    : /Studio/i.test(name) ? 1
    : /Neural2|Wavenet/i.test(name) ? 2
    : 3;
  return voices
    .map((v) => ({ name: v.name, gender: v.ssmlGender, tier: tier(v.name) }))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

/**
 * Whether a voice is one of the Chirp tiers, which are paced by the model.
 *
 * Chirp 3: HD does not take `speakingRate` or `pitch` — pace control exists
 * only as an en-US experiment — and sending them is a 400 on every line rather
 * than a setting quietly ignored. So the 5% slow-down the other tiers get is
 * dropped here rather than worked around: it was a nudge toward learner pace,
 * not a requirement, and Chirp reads short lines slowly enough on its own that
 * buying it back with ffmpeg would cost more than it is worth.
 */
const isChirp = (voice) => /chirp/i.test(voice ?? "");

/**
 * Asking for a delivery rather than just a voice.
 *
 * Chirp 3: HD is the most natural-sounding tier Google has, and the thing it
 * cannot do is be told *how* to say a line — it has no styles, no emotion
 * parameter and no prosody. The one model family on this same API that does is
 * Gemini-TTS, which takes a plain-English instruction in `input.prompt` and is
 * selected with `voice.modelName`. Both fields are real on v1; neither does
 * anything to a Chirp voice.
 *
 * So the switch is two environment variables rather than a second engine:
 *
 *   GOOGLE_TTS_MODEL=gemini-2.5-flash-tts \
 *   GOOGLE_TTS_STYLE="Warm and encouraging, like a friendly local talking to
 *     someone who is still learning the language." \
 *   node scripts/generate-audio.mjs --locale sv-SE --force --sample 6
 *
 * Audition before committing a whole edition to it. Gemini-TTS is a preview
 * model, its language list is not Chirp's, and it may not return MP3 for every
 * locale — which is precisely why the default stays on Chirp and this is an
 * override rather than the other way round.
 */
const GOOGLE_MODEL = process.env.GOOGLE_TTS_MODEL || null;
const GOOGLE_STYLE = process.env.GOOGLE_TTS_STYLE || null;

async function synthGoogle(text, cfg, outPath) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY is not set");

  const audioConfig = { audioEncoding: "MP3" };
  if (!isChirp(cfg.voice)) audioConfig.speakingRate = 0.95;

  const voice = { languageCode: cfg.languageCode, name: cfg.voice };
  if (GOOGLE_MODEL) voice.modelName = GOOGLE_MODEL;

  // Plain text, never SSML. Chirp 3: HD accepts a small set of SSML tags now
  // and none of them do anything a spoken phrase here needs, and `speakable`
  // has already turned the slots and slashes into commas.
  const input = { text };
  if (GOOGLE_STYLE) input.prompt = GOOGLE_STYLE;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, voice, audioConfig }),
    }
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    // A voice name that doesn't exist comes back as a 400 with the name in it,
    // which is easy to miss among 250 lines of output.
    throw new Error(`Google TTS ${res.status} for voice ${cfg.voice}: ${detail}`);
  }
  const { audioContent } = await res.json();
  if (!audioContent) throw new Error("Google TTS returned no audio");
  writeFileSync(outPath, Buffer.from(audioContent, "base64"));
}

/**
 * The voices Azure will accept for a language, neural first.
 *
 * Same reasoning as the Google list: one request before spending a hundred, and
 * a name that has been retired should say so once rather than fail on every
 * line.
 */
async function listAzureVoices(languageCode) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key) throw new Error("AZURE_SPEECH_KEY is not set");
  if (!region) throw new Error("AZURE_SPEECH_REGION is not set (e.g. northeurope)");

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    { headers: { "Ocp-Apim-Subscription-Key": key } }
  );
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Azure rejected the key (${res.status}). Check AZURE_SPEECH_KEY, and that ` +
        `AZURE_SPEECH_REGION (${region}) matches the region the resource lives in.`
    );
  }
  if (!res.ok) throw new Error(`Azure voices ${res.status}: ${(await res.text()).slice(0, 200)}`);

  return (await res.json())
    .filter((v) => v.Locale?.toLowerCase() === languageCode.toLowerCase())
    .map((v) => ({ name: v.ShortName, gender: v.Gender, tier: /Neural/i.test(v.ShortName) ? 0 : 1 }))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

/** Escapes text for the SSML document Azure expects. */
function xmlEscape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function synthAzure(text, cfg, outPath) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key) throw new Error("AZURE_SPEECH_KEY is not set");
  if (!region) throw new Error("AZURE_SPEECH_REGION is not set (e.g. northeurope)");

  const ssml =
    `<speak version="1.0" xml:lang="${cfg.languageCode}">` +
    `<voice name="${cfg.voice}"><prosody rate="-5%">${xmlEscape(text)}</prosody></voice>` +
    `</speak>`;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      // 24kHz mono MP3: indistinguishable from the 48kHz tiers for one spoken
      // line, and a fraction of the bytes to ship to a phone.
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      // Azure rejects requests without one.
      "User-Agent": "convi-audio-generator",
    },
    body: ssml,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Azure rejected the key (${res.status}). Check AZURE_SPEECH_KEY and that ` +
        `AZURE_SPEECH_REGION (${region}) is the region the resource was created in.`
    );
  }
  if (!res.ok) {
    throw new Error(`Azure TTS ${res.status} for voice ${cfg.voice}: ${(await res.text()).slice(0, 200)}`);
  }

  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
}

/**
 * Makes sure the Piper voice is on disk, downloading it if not.
 *
 * Part of the job rather than a step to remember: the model is tens of
 * megabytes, it is never committed, and a fresh checkout or a CI runner has
 * never seen it.
 */
function ensurePiperVoice(cfg) {
  if (!cfg.voiceName || existsSync(cfg.model)) return;
  console.log(`  fetching voice ${cfg.voiceName}…`);
  mkdirSync(VOICE_DIR, { recursive: true });
  execFileSync(
    "python3",
    ["-m", "piper.download_voices", cfg.voiceName, "--download-dir", VOICE_DIR],
    { stdio: "inherit" }
  );
}

/** Whether ffmpeg is on the path, checked once. */
let ffmpeg = null;
function hasFfmpeg() {
  if (ffmpeg === null) {
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      ffmpeg = true;
    } catch {
      ffmpeg = false;
    }
  }
  return ffmpeg;
}

function synthPiper(text, cfg, outPath) {
  // `-m` and `-f` rather than the long forms: the long ones have been spelled
  // both --output_file and --output-file across piper versions, the short ones
  // never changed.
  const wavPath = outPath.replace(/\.mp3$/, ".wav");
  execFileSync("piper", ["-m", cfg.model, "-f", wavPath], {
    input: text,
    stdio: ["pipe", "ignore", "pipe"],
  });

  // Piper writes WAV, which is five times the bytes of the MP3 the cloud
  // providers return — worth converting where there is an encoder, since these
  // are downloaded by phones. Where there isn't, the WAV is what ships; the
  // manifest records the extension either way.
  if (hasFfmpeg()) {
    const mp3Path = wavPath.replace(/\.wav$/, ".mp3");
    execFileSync("ffmpeg", ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "48k", mp3Path], {
      stdio: "ignore",
    });
    rmSync(wavPath);
  }
}


/**
 * The same few lines, in every female voice Google has for a locale.
 *
 * Picking a voice by reading names is guessing. This renders a handful of real
 * lines from the edition — not "hello world", because what matters is how a
 * voice handles *these* sentences — once per candidate, into a scratch folder
 * that is never committed and never served. Play them, pick one, put it in
 * PROVIDERS or in GOOGLE_VOICE_DE / GOOGLE_VOICE_SV.
 *
 * Candidates come from the API rather than a list in this file, so a voice
 * Google adds next month turns up here without anybody editing anything.
 */
async function audition(locale, cfg) {
  if (cfg.provider !== "google") {
    console.error(`  --audition is Google-only; ${locale} is on ${cfg.provider}`);
    return 0;
  }

  const wanted = auditionTier(cfg.voice);
  const candidates = (await listGoogleVoices(cfg.languageCode)).filter(
    (v) => String(v.gender).toUpperCase() === "FEMALE" && wanted.test(v.name)
  );
  if (candidates.length === 0) {
    console.error(`  no female ${wanted} voices for ${cfg.languageCode}`);
    return 0;
  }

  const lines = spokenLines(locale).slice(0, sample > 0 ? sample : 3);
  const dir = path.join(ROOT, ".audio-audition", locale);
  mkdirSync(dir, { recursive: true });
  console.log(`  ${candidates.length} female voices x ${lines.length} lines -> .audio-audition/${locale}/`);

  let made = 0;
  for (const voice of candidates) {
    for (const [i, line] of lines.entries()) {
      const out = path.join(dir, `${voice.name}--${i + 1}.mp3`);
      try {
        await synthGoogle(speakable(line.text, locale), { ...cfg, voice: voice.name }, out);
        made++;
        process.stdout.write(".");
      } catch (err) {
        console.error(`\n  ${voice.name}: ${err.message}`);
        break;
      }
    }
  }
  return made;
}

/** Audition like for like: Chirp against Chirp, Studio against Studio. */
const auditionTier = (voice) => (isChirp(voice) ? /Chirp3-HD/i : /Studio|Neural2/i);

async function run() {
  const locales = only ? [only] : Object.keys(PROVIDERS);
  let made = 0, skipped = 0, failed = 0;

  if (auditionOnly) {
    for (const locale of locales) {
      const cfg = providerFor(locale);
      if (!cfg) continue;
      console.log(`\n${locale} — auditioning female voices`);
      made += await audition(locale, cfg);
    }
    console.log(`\n\n${made} clips written to .audio-audition/ — listen, then set the voice.`);
    return;
  }

  if (listOnly) {
    for (const locale of locales) {
      const cfg = providerFor(locale);
      if (cfg?.provider !== "google" && cfg?.provider !== "azure") continue;
      const voices =
        cfg.provider === "google"
          ? await listGoogleVoices(cfg.languageCode)
          : await listAzureVoices(cfg.languageCode);
      console.log(`\n${locale} — voices ${cfg.provider} offers, newest tier first:`);
      for (const v of voices) {
        console.log(`  ${v.name.padEnd(30)} ${String(v.gender).toLowerCase()}`);
      }
    }
    return;
  }

  for (const locale of locales) {
    const cfg = providerFor(locale);
    if (!cfg) {
      console.error(`  unknown locale ${locale}`);
      continue;
    }

    const outDir = path.join(OUT_ROOT, locale);
    if (!dryRun) mkdirSync(outDir, { recursive: true });

    let lines = spokenLines(locale);
    if (sample > 0) lines = lines.slice(0, sample);
    const chars = lines.reduce((n, l) => n + l.text.length, 0);
    console.log(`\n${locale} via ${cfg.provider}: ${lines.length} lines, ${chars} characters`);

    // Before the preflight, not after: this is about what is already on disk,
    // it costs no request, and it is the thing worth knowing before a run that
    // is about to skip every line.
    warnIfVoiceChanged(locale, cfg);

    // Check the voice exists before spending a request per line on it.
    if (cfg.provider === "google" && !dryRun) {
      const available = await listGoogleVoices(cfg.languageCode);
      if (!available.some((v) => v.name === cfg.voice)) {
        console.error(`\n  ${cfg.voice} is not a voice Google offers for ${cfg.languageCode}.`);
        console.error("  Available, newest tier first:");
        for (const v of available.slice(0, 12)) {
          console.error(`    ${v.name.padEnd(28)} ${v.gender.toLowerCase()}`);
        }
        console.error("  Set GOOGLE_VOICE_ES / GOOGLE_VOICE_DE to one of these.");
        failed++;
        continue;
      }
      console.log(`  voice: ${cfg.voice}`);
    }

    // Same preflight for Azure: one request, rather than the same failure a
    // hundred times over.
    if (cfg.provider === "azure" && !dryRun) {
      const available = await listAzureVoices(cfg.languageCode);
      if (!available.some((v) => v.name === cfg.voice)) {
        console.error(`\n  ${cfg.voice} is not a voice Azure offers for ${cfg.languageCode}.`);
        console.error("  Available, neural first:");
        for (const v of available.slice(0, 12)) {
          console.error(`    ${v.name.padEnd(30)} ${String(v.gender).toLowerCase()}`);
        }
        console.error("  Set AZURE_VOICE_SV to one of these.");
        failed++;
        continue;
      }
      console.log(`  voice: ${cfg.voice}`);
    }

    if (cfg.provider === "piper" && !dryRun) {
      ensurePiperVoice(cfg);
      console.log(`  voice: ${cfg.voiceName ?? cfg.model}${hasFfmpeg() ? " (mp3)" : " (wav — no ffmpeg)"}`);
    }

    for (const line of lines) {
      const ext = cfg.provider === "piper" && !hasFfmpeg() ? "wav" : "mp3";
      const outPath = path.join(outDir, `${line.id}.${ext}`);
      if (!force && existsSync(outPath)) { skipped++; continue; }
      if (dryRun) { made++; continue; }

      try {
        const text = speakable(line.text, locale);
        if (cfg.provider === "google") await synthGoogle(text, cfg, outPath);
        else if (cfg.provider === "azure") await synthAzure(text, cfg, outPath);
        else synthPiper(text, cfg, outPath);
        made++;
        process.stdout.write(".");
      } catch (err) {
        failed++;
        console.error(`\n  ${line.id}: ${err.message}`);
        if (failed > 3) {
          console.error("  too many failures, stopping this locale");
          break;
        }
      }
    }
  }

  if (!dryRun) {
    for (const locale of locales) {
      writeManifest(locale);
      writeVoiceRecord(locale, providerFor(locale));
    }
  }

  console.log(`\n\n${made} generated, ${skipped} already present, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

/**
 * Which voice the clips on disk were cut with.
 *
 * The one thing this script cannot work out by looking: an MP3 does not say
 * who read it. Every run skips lines that already exist, which is what makes
 * re-running after a content edit cheap — and also means that changing a
 * locale's voice and re-running does nothing at all, silently, leaving a deck
 * half in one voice and half in another the next time a line is added. That is
 * exactly what switching Swedish from Azure to Chirp 3 would have done.
 *
 * So the voice is written down beside the clips and checked on the way in. The
 * file is never read by the app — `writeManifest` only picks up .mp3 and .wav,
 * and `speech.ts` only ever asks for index.json.
 */
const voicePath = (locale) => path.join(OUT_ROOT, locale, "voice.json");

function readVoiceRecord(locale) {
  try {
    return JSON.parse(readFileSync(voicePath(locale), "utf8"));
  } catch {
    return null;
  }
}

function writeVoiceRecord(locale, cfg) {
  const dir = path.join(OUT_ROOT, locale);
  if (!cfg || !existsSync(dir)) return;
  const voice = cfg.voice ?? cfg.voiceName ?? cfg.model;
  writeFileSync(voicePath(locale), `${JSON.stringify({ provider: cfg.provider, voice })}\n`);
}

/** How many clips are already on disk for a locale. */
function clipsOnDisk(locale) {
  const dir = path.join(OUT_ROOT, locale);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => /\.(mp3|wav)$/.test(f)).length;
}

/** Says so, loudly, when the clips on disk were read by somebody else. */
function warnIfVoiceChanged(locale, cfg) {
  if (force || dryRun) return;
  const have = clipsOnDisk(locale);
  if (have === 0) return;

  const was = readVoiceRecord(locale);
  const now = cfg.voice ?? cfg.voiceName ?? cfg.model;
  if (was && was.provider === cfg.provider && was.voice === now) return;

  const which = was
    ? `were cut with ${was.voice} (${was.provider}), not ${now}`
    : `predate this record, so nothing here knows what read them`;
  console.warn(
    `\n  the ${have} clips already in ${locale} ${which}.\n` +
      `  Without --force they are kept and only new lines get ${now}, which\n` +
      `  leaves the edition reading in two voices. Re-run with --force.\n`
  );
}

/**
 * An index of what was generated, written beside the clips.
 *
 * Without it the app has to guess: it would ask the server for every clip it
 * might want and take a 404 as "no clip", which is two wasted requests per line
 * and a console full of red on any deck that has no audio yet. One small file
 * answers the question for a whole locale in a single request, and its absence
 * is itself the answer — no audio here, don't ask again.
 *
 * Built from the directory rather than from what this run produced, so a
 * partial run still describes everything actually on disk.
 */
function writeManifest(locale) {
  const dir = path.join(OUT_ROOT, locale);
  if (!existsSync(dir)) return;

  const clips = {};
  // Sorted so that where a line somehow has both — a WAV from a run before
  // ffmpeg was installed, an MP3 from after — the MP3 is the one recorded.
  for (const file of readdirSync(dir).sort()) {
    const match = file.match(/^(.+)\.(mp3|wav)$/);
    if (match) clips[match[1]] = match[2];
  }

  const count = Object.keys(clips).length;
  if (count === 0) return;
  writeFileSync(path.join(dir, "index.json"), `${JSON.stringify(clips, null, 0)}\n`);
  console.log(`\n${locale}: manifest lists ${count} clips`);
}

run().catch((err) => {
  // Everything that can go wrong before the first line is synthesised — no key,
  // a rejected key, the API unreachable — arrives here. A stack trace helps
  // nobody run a script; the message is the useful part.
  console.error(`\n${err.message}`);
  if (/GOOGLE_TTS_API_KEY/.test(err.message)) {
    console.error("Get one from console.cloud.google.com, with the Text-to-Speech API enabled.");
  }
  if (/AZURE_SPEECH/.test(err.message)) {
    console.error("Create a Speech resource on the free F0 tier at portal.azure.com;");
    console.error("its Keys and Endpoint page has both the key and the region.");
  }
  process.exitCode = 1;
});
