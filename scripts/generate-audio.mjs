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
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_ROOT = path.join(ROOT, "public", "audio");

const args = process.argv.slice(2);
const only = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

/** Voice choices. Google names are stable; Piper needs a downloaded .onnx. */
const PROVIDERS = {
  "es-ES": { provider: "google", voice: "es-ES-Neural2-B", languageCode: "es-ES" },
  "de-DE": { provider: "google", voice: "de-DE-Neural2-D", languageCode: "de-DE" },
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

/** What actually gets sent to the synthesiser. */
function speakable(text) {
  return text
    .replace(/_{2,}/g, ", ")          // "Son __ euros." -> a beat, not "underscore"
    .replace(/\[[^\]]+\]/g, ", ")     // same for [BELOPP] / [STATION]
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
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

  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
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

  for (const locale of locales) {
    const cfg = PROVIDERS[locale];
    if (!cfg) {
      console.error(`  unknown locale ${locale}`);
      continue;
    }

    const outDir = path.join(OUT_ROOT, locale);
    if (!dryRun) mkdirSync(outDir, { recursive: true });

    const lines = spokenLines(locale);
    const chars = lines.reduce((n, l) => n + l.text.length, 0);
    console.log(`\n${locale} via ${cfg.provider}: ${lines.length} lines, ${chars} characters`);

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

  console.log(`\n\n${made} generated, ${skipped} already present, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
