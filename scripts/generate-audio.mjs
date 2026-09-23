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
 *   de-DE, sv-SE -> Edge TTS, female neural voice (needs `pip install edge-tts`)
 *   es-ES        -> Google Cloud Text-to-Speech, Studio (needs GOOGLE_TTS_API_KEY)
 *
 * German and Swedish go through Edge TTS because it needs nothing else: no
 * account, no card, no billing project, no API key. Google Cloud wanted a
 * billing account attached before it would serve a single character, which is
 * a strange thing to set up for a job that runs a few times a year and commits
 * its output. Spanish stays on Studio, unmoved and so far unrecorded.
 *
 * Google, Azure and Piper are all still here and still correct, one flag away
 * (`--engine google`, `--engine azure`, `--engine piper`) rather than the
 * default for any locale. Edge is a consumer endpoint with no contract behind
 * it; when that stops being an acceptable trade, the replacement is already
 * written.
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
 * Google voices per locale, used when `--engine google` overrides the default.
 *
 * Chirp 3: HD is the best-sounding tier any of these providers offer, and it
 * needs GOOGLE_TTS_API_KEY on a project with a billing account attached —
 * which is the whole reason it is not the default. If that account ever
 * exists, this is one flag and one --force away.
 */
const GOOGLE_VOICES = {
  "sv-SE": process.env.GOOGLE_VOICE_SV ?? "sv-SE-Chirp3-HD-Aoede",
  "de-DE": process.env.GOOGLE_VOICE_DE ?? "de-DE-Chirp3-HD-Aoede",
  "es-ES": process.env.GOOGLE_VOICE_ES ?? "es-ES-Studio-F",
};

/**
 * Azure voices per locale, used when `--engine azure` overrides the default.
 *
 * The same voices Edge reaches, through the front door: a Speech resource on
 * the free F0 tier, with a key and a region. Worth it only if the consumer
 * endpoint Edge uses stops being dependable, which is exactly what this is
 * kept for.
 */
const AZURE_VOICES = {
  "sv-SE": process.env.AZURE_VOICE_SV ?? "sv-SE-SofieNeural",
  "de-DE": process.env.AZURE_VOICE_DE ?? "de-DE-KatjaNeural",
  "es-ES": process.env.AZURE_VOICE_ES ?? "es-ES-ElviraNeural",
};

/**
 * Edge voices per locale, used when `--engine edge` overrides the default. Only
 * Spanish needs it, since German and Swedish are on Edge already; it used to be
 * promised in a comment and silently ignored, leaving Spanish on Google.
 */
const EDGE_VOICES = {
  "sv-SE": process.env.EDGE_VOICE_SV ?? "sv-SE-SofieNeural",
  "de-DE": process.env.EDGE_VOICE_DE ?? "de-DE-KatjaNeural",
  "es-ES": process.env.EDGE_VOICE_ES ?? "es-ES-ElviraNeural",
};

function providerFor(locale) {
  const base = PROVIDERS[locale];
  if (!base || !engine) return base;

  if (engine === "edge") {
    const voice = EDGE_VOICES[locale];
    return voice ? { provider: "edge", voice, languageCode: locale } : base;
  }

  if (engine === "google") {
    const voice = GOOGLE_VOICES[locale];
    return voice ? { provider: "google", voice, languageCode: locale } : base;
  }

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
 * Voice choices: a female neural voice for German and Swedish, through Edge TTS.
 *
 * Katja and Sofie are the German and Swedish voices Azure has shipped for
 * years and the ones Edge reads those languages in. Both are female, which is
 * the point: a learner hears the same kind of person in Talk Mode, in practice
 * and on the scenario page.
 *
 * Every one is overridable from the environment, because this is a matter of
 * taste and the only way to settle it is to listen:
 *
 *   EDGE_VOICE_DE=de-DE-AmalaNeural node scripts/generate-audio.mjs \
 *     --locale de-DE --force --sample 6
 *
 * `--force` matters when comparing: without it, lines already on disk are
 * skipped and you would hear the old voice back. `--audition` does the same
 * thing across every female voice Edge lists for the locale at once.
 *
 * What none of these can do is take direction. Style and emotion controls are
 * an Azure SSML feature that the read-aloud endpoint does not expose, so the
 * delivery is whatever the voice does naturally, slowed 5% by EDGE_RATE.
 */
const PROVIDERS = {
  // Spanish is deliberately left where it was. It has no clips yet either, but
  // moving it is a separate decision from getting German and Swedish spoken,
  // and Studio is the tier its voice was chosen on. `--engine edge` reaches
  // Elvira the day that decision gets made.
  "es-ES": {
    provider: "google",
    voice: process.env.GOOGLE_VOICE_ES ?? "es-ES-Studio-F",
    languageCode: "es-ES",
  },
  "de-DE": {
    provider: "edge",
    voice: process.env.EDGE_VOICE_DE ?? "de-DE-KatjaNeural",
    languageCode: "de-DE",
  },
  "sv-SE": {
    provider: "edge",
    voice: process.env.EDGE_VOICE_SV ?? "sv-SE-SofieNeural",
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
 * Edge TTS: the same neural voices, with nothing to sign up for.
 *
 * `edge-tts` drives the read-aloud service Microsoft Edge itself uses. The
 * voices are the Azure neural catalogue under the same names — Sofie reading
 * Swedish here is the Sofie the Azure path was pointed at — but there is no
 * account, no card, no billing project and no key. For a build-time job that
 * runs once per content change and commits its output, that is the whole
 * argument: the clips are the deliverable, and the cheapest way to get them is
 * the one with no invoice attached to it.
 *
 * What it is not: an API with a contract. It is a consumer endpoint, it can
 * change without notice, and it is rate-limited in ways nobody documents. The
 * Google and Azure paths below stay exactly where they are behind `--engine`
 * for the day that matters.
 */
function edgeAvailable() {
  try {
    execFileSync("edge-tts", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function requireEdge() {
  if (edgeAvailable()) return;
  throw new Error(
    "edge-tts is not on the path. Install it with `pip install edge-tts` " +
      "(or `pipx install edge-tts`), then run this again."
  );
}

/**
 * The voices Edge will accept for a language, female first.
 *
 * Same reasoning as the Google and Azure listings: one call before spending
 * several hundred, so a renamed voice says so once instead of failing on every
 * line. `--list-voices` prints names and genders, which is also the only
 * honest way to pick one.
 */
/**
 * Runs edge-tts and turns a Python traceback into one line.
 *
 * Every failure here arrives as forty lines of stack ending in the sentence
 * that matters, and this script prints one of these per line of content. So
 * the last line is kept, the rest is dropped, and the two failures anybody
 * actually hits get named: the endpoint being unreachable, and edge-tts having
 * fallen behind a change at Microsoft's end.
 */
function edgeRun(argv, options = {}) {
  try {
    return execFileSync("edge-tts", argv, { stdio: ["ignore", "pipe", "pipe"], ...options });
  } catch (err) {
    const stderr = String(err.stderr ?? "").trim();
    const last = stderr.split("\n").filter(Boolean).pop() ?? err.message;
    const hint = /SkewAdjustment|ClientConnector|Cannot connect|TimeoutError|NoAudioReceived/i.test(stderr)
      ? " — the read-aloud endpoint could not be reached, or edge-tts is out of date. " +
        "Check the network, then `pip install --upgrade edge-tts`."
      : "";
    throw new Error(`edge-tts: ${last}${hint}`);
  }
}

function listEdgeVoices(languageCode) {
  requireEdge();
  const out = edgeRun(["--list-voices"], { encoding: "utf8" });

  const voices = [];
  let name = null;
  for (const line of out.split("\n")) {
    const named = line.match(/^Name:\s*(\S+)/);
    if (named) name = named[1];
    const gender = line.match(/^Gender:\s*(\S+)/);
    if (gender && name) {
      voices.push({ name, gender: gender[1] });
      name = null;
    }
    // Older builds print a plain table: "sv-SE-SofieNeural  Female  General".
    const row = line.match(/^(\S+-\S+-\S+Neural\S*)\s+(Female|Male)\b/);
    if (row) voices.push({ name: row[1], gender: row[2] });
  }

  const wanted = languageCode.toLowerCase();
  const seen = new Set();
  return voices
    .filter((v) => v.name.toLowerCase().startsWith(`${wanted}-`))
    .filter((v) => (seen.has(v.name) ? false : seen.add(v.name)))
    .map((v) => ({ name: v.name, gender: v.gender, tier: /female/i.test(v.gender) ? 0 : 1 }))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

/**
 * One line, spoken.
 *
 * `--rate` with an `=` and no space: the value starts with a minus sign, and
 * argparse reads a bare `-5%` as another flag. The 5% slow-down is the one the
 * Azure path applied with `<prosody rate="-5%">` and the one Chirp could not
 * take at all — a nudge toward the pace somebody still learning can follow.
 *
 * Edge writes 24kHz mono MP3, which is what the rest of this script and the
 * manifest already expect. No ffmpeg, no conversion step.
 */
async function synthEdge(text, cfg, outPath) {
  // The read-aloud endpoint drops the odd request when it is asked for eight
  // hundred lines back to back: a closed socket, or "no audio received". Those
  // are worth a second try after a pause. Anything else, a voice that does not
  // exist or edge-tts behind a change at Microsoft's end, fails the same way
  // every time, so it is not retried.
  for (let attempt = 1; ; attempt++) {
    try {
      edgeRun(["--voice", cfg.voice, "--text", text, "--write-media", outPath, `--rate=${EDGE_RATE}`]);
      return;
    } catch (err) {
      const transient = /NoAudioReceived|WebSocket|ServerDisconnected|Timeout|Cannot connect|ClientConnector|reset by peer/i.test(
        err.message
      );
      if (!transient || attempt >= EDGE_ATTEMPTS) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** (attempt - 1)));
    }
  }
}

/** Tries per line before a transient Edge failure counts as a failure. */
const EDGE_ATTEMPTS = 4;

/** How much slower than native. Overridable, because taste varies. */
const EDGE_RATE = process.env.EDGE_RATE ?? "-5%";

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
  const all = await voicesFor(cfg);
  if (!all) {
    console.error(`  --audition has no voice list for ${cfg.provider}`);
    return 0;
  }

  // Google keeps several generations live at once, so an audition there has to
  // compare like with like. Edge and Azure offer one neural tier and no such
  // problem.
  const tier = cfg.provider === "google" ? (isChirp(cfg.voice) ? /Chirp3-HD/i : /Studio|Neural2/i) : /./;
  const candidates = all.filter(
    (v) => String(v.gender).toUpperCase() === "FEMALE" && tier.test(v.name)
  );
  if (candidates.length === 0) {
    console.error(`  no female voices listed for ${cfg.languageCode}`);
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
        await synthOne(speakable(line.text, locale), { ...cfg, voice: voice.name }, out);
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

/** Whatever the provider says it has for this language, or null if it can't say. */
async function voicesFor(cfg) {
  if (cfg.provider === "edge") return listEdgeVoices(cfg.languageCode);
  if (cfg.provider === "google") return await listGoogleVoices(cfg.languageCode);
  if (cfg.provider === "azure") return await listAzureVoices(cfg.languageCode);
  return null;
}

/** One line through whichever synthesiser this locale is configured for. */
async function synthOne(text, cfg, outPath) {
  if (cfg.provider === "edge") return synthEdge(text, cfg, outPath);
  if (cfg.provider === "google") return await synthGoogle(text, cfg, outPath);
  if (cfg.provider === "azure") return await synthAzure(text, cfg, outPath);
  return synthPiper(text, cfg, outPath);
}

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
      const voices = cfg ? await voicesFor(cfg) : null;
      if (!voices) continue;
      console.log(`\n${locale} — voices ${cfg.provider} offers, female first:`);
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

    // Check the voice exists before spending a request per line on it. One
    // listing beats the same failure eight hundred times over, and the list it
    // prints on a miss is the answer to "so what is it called now".
    if (cfg.provider !== "piper" && !dryRun) {
      const available = await voicesFor(cfg);
      if (available && !available.some((v) => v.name === cfg.voice)) {
        console.error(`\n  ${cfg.voice} is not a voice ${cfg.provider} offers for ${cfg.languageCode}.`);
        console.error("  Available, female first:");
        for (const v of available.slice(0, 12)) {
          console.error(`    ${v.name.padEnd(32)} ${String(v.gender).toLowerCase()}`);
        }
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
        await synthOne(speakable(line.text, locale), cfg, outPath);
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
      // Only after a complete, forced run with nothing failed: that is the one
      // case where everything on disk that is not a current line is known to be
      // left over, from a line since edited away or from the voice before.
      if (force && sample === 0 && failed === 0) pruneStale(locale);
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
 * Deletes clips that no current line is read from.
 *
 * `--force` rewrites every line that exists and leaves everything else where it
 * was, so a clip for a line since deleted from the content kept being listed in
 * the manifest, still in the voice being replaced. Nothing plays a clip whose
 * id no line carries, so the cost was bytes rather than sound, but a re-record
 * is exactly when an edition should end up in one voice and nothing else.
 */
function pruneStale(locale) {
  const dir = path.join(OUT_ROOT, locale);
  if (!existsSync(dir)) return;
  const current = new Set(spokenLines(locale).map((line) => line.id));
  let removed = 0;
  for (const file of readdirSync(dir)) {
    const match = file.match(/^(.+)\.(mp3|wav)$/);
    if (match && !current.has(match[1])) {
      rmSync(path.join(dir, file));
      removed++;
    }
  }
  if (removed) console.log(`\n${locale}: removed ${removed} clips no line uses any more`);
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
  if (/edge-tts is not on the path/.test(err.message)) {
    console.error("It is a Python package: `pip install edge-tts`, or `pipx install edge-tts`.");
  }
  if (/AZURE_SPEECH/.test(err.message)) {
    console.error("Create a Speech resource on the free F0 tier at portal.azure.com;");
    console.error("its Keys and Endpoint page has both the key and the region.");
  }
  process.exitCode = 1;
});
