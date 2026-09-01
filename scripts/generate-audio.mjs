#!/usr/bin/env node
/**
 * Generates one audio file per spoken line, once, at author time.
 *
 * The whole catalogue is ~11k characters — about 1% of Google's monthly free
 * tier — so this is a build-time job, not a runtime service. Output is committed
 * and served statically: no API key in production, no per-user cost, no latency.
 *
 * Providers, per the chosen split:
 *   es-ES, de-DE -> Google Cloud Text-to-Speech (needs GOOGLE_TTS_API_KEY)
 *   sv-SE        -> Piper, run locally (needs `piper` and a Swedish voice)
 *
 * Idempotent: a line whose file already exists is skipped, so re-running after
 * adding content only synthesises the new lines. Pass --force to redo all.
 *
 *   node scripts/generate-audio.mjs [--locale sv-SE] [--force] [--dry-run]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_ROOT = path.join(ROOT, "public", "audio");

const args = process.argv.slice(2);
const only = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const listOnly = args.includes("--list-voices");
// Auditioning a voice shouldn't cost the whole deck. `--sample 6` does the
// first six lines only, which is enough to hear what a voice is like.
const sample = args.includes("--sample") ? Number(args[args.indexOf("--sample") + 1]) : 0;

/**
 * Voice choices. Google names are stable; Piper needs a downloaded .onnx.
 *
 * Google keeps several generations of voice live at once and they do not sound
 * alike: Studio and Chirp3-HD are the current recorded-neural tiers, Neural2 is
 * the generation before, and Standard is concatenative and shows it. Which one
 * suits a deck of short spoken lines is a matter of taste, so every voice can
 * be overridden from the environment — generate a few lines with one, listen,
 * keep the one you like:
 *
 *   GOOGLE_VOICE_ES=es-ES-Studio-F node scripts/generate-audio.mjs --locale es-ES --force
 *
 * `--force` matters when comparing: without it, lines already on disk are
 * skipped and you would hear the old voice back.
 */
const PROVIDERS = {
  "es-ES": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_ES ?? "es-ES-Studio-F",
    languageCode: "es-ES",
  },
  "de-DE": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_DE ?? "de-DE-Studio-B",
    languageCode: "de-DE",
  },
  "sv-SE": { provider: "piper", model: process.env.PIPER_SV_MODEL ?? "sv_SE-nst-medium.onnx" },
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
      for (const ex of sub.exchanges ?? []) {
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
 * What actually gets sent to the synthesiser.
 *
 * Mirrors stripForSpeech in src/components/quiz/speech.ts, and for the same
 * reasons: " / " with spaces around it separates two ways of saying the same
 * thing, and a clip that says both has the voice repeat itself. Only the first
 * is recorded. A slash without spaces joins alternatives inside one phrase and
 * becomes a beat, as do the fill-in slots.
 */
function speakable(text) {
  const [first] = text.split(/\s+\/\s+/);
  return (first?.trim() ? first : text)
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

async function synthGoogle(text, cfg, outPath) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error("GOOGLE_TTS_API_KEY is not set");

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: cfg.languageCode, name: cfg.voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
      }),
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

function synthPiper(text, cfg, outPath) {
  // Piper emits WAV on stdout. Kept as .wav rather than shelling out to an
  // encoder that may not be installed; these clips are 1-3 seconds.
  const wavPath = outPath.replace(/\.mp3$/, ".wav");
  execFileSync("piper", ["--model", cfg.model, "--output_file", wavPath], { input: text });
}

async function run() {
  const locales = only ? [only] : Object.keys(PROVIDERS);
  let made = 0, skipped = 0, failed = 0;

  if (listOnly) {
    for (const locale of locales) {
      const cfg = PROVIDERS[locale];
      if (cfg?.provider !== "google") continue;
      console.log(`\n${locale} — voices Google offers, newest tier first:`);
      for (const v of await listGoogleVoices(cfg.languageCode)) {
        console.log(`  ${v.name.padEnd(28)} ${v.gender.toLowerCase()}`);
      }
    }
    return;
  }

  for (const locale of locales) {
    const cfg = PROVIDERS[locale];
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

    for (const line of lines) {
      const ext = cfg.provider === "piper" ? "wav" : "mp3";
      const outPath = path.join(outDir, `${line.id}.${ext}`);
      if (!force && existsSync(outPath)) { skipped++; continue; }
      if (dryRun) { made++; continue; }

      try {
        const text = speakable(line.text);
        if (cfg.provider === "google") await synthGoogle(text, cfg, outPath);
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

  if (!dryRun) for (const locale of locales) writeManifest(locale);

  console.log(`\n\n${made} generated, ${skipped} already present, ${failed} failed`);
  if (failed) process.exitCode = 1;
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
  for (const file of readdirSync(dir)) {
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
  process.exitCode = 1;
});
