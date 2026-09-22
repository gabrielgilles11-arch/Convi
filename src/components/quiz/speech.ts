/**
 * Saying a line out loud.
 *
 * Two sources, in order. A clip generated at author time
 * (scripts/generate-audio.mjs) is always preferred: one voice per language,
 * identical on every device, and it sounds like a person. Where no clip exists
 * the browser's own speech engine reads the line instead — good on iOS, macOS
 * and Android, flatter on some desktops, and occasionally missing a language
 * altogether. That fallback is what makes the feature real today rather than
 * after a generator run, and it disappears on its own as clips land.
 *
 * Nothing here reaches the network except the HEAD probe for a clip, which is
 * same-origin. speechSynthesis is local to the device.
 *
 * Separate from ./sound, which is the two answer tones. They are different
 * things — one is feedback, one is the language — so they toggle separately.
 */

const STORAGE_KEY = "convi:voice:v1";

/** Voice is on unless the learner has turned it off. */
export function voiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setVoiceEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode. The setting just won't survive the session.
  }
  if (!on) stopSpeaking();
  for (const listener of listeners) listener();
}

/**
 * The setting is read by every speaker button on the screen, and the toggle
 * that changes it is somewhere else entirely. Rather than thread it down as a
 * prop through three components, buttons subscribe to it.
 */
const listeners = new Set<() => void>();

export function subscribeVoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * What clips exist for a locale: `{ "de-beer-food-01-a0": "mp3", … }`, written
 * next to them by scripts/generate-audio.mjs.
 *
 * One request answers for the whole deck. Asking per line instead would mean a
 * HEAD for every speaker on the screen and, on a deck with no audio generated
 * yet, two 404s each — a console full of red describing a feature that is
 * working exactly as intended. A missing manifest is the answer, not a failure:
 * this locale has no clips, so nothing else is ever requested.
 *
 * Fetched on the first line anyone asks to hear, never at import: a visitor who
 * doesn't tap a speaker shouldn't pay for one.
 */
type Manifest = Record<string, string>;
const manifests = new Map<string, Promise<Manifest>>();

function manifestFor(locale: string): Promise<Manifest> {
  const cached = manifests.get(locale);
  if (cached) return cached;

  const pending = fetch(`/audio/${locale}/index.json`)
    .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : {}))
    .catch(() => ({}));
  manifests.set(locale, pending);
  return pending;
}

async function clipUrl(locale: string, audioId: string | null): Promise<string | null> {
  if (!audioId) return null;
  const clips = await manifestFor(locale);
  const ext = clips[audioId];
  return ext ? `/audio/${locale}/${audioId}.${ext}` : null;
}

/**
 * Whether a generated clip exists for this line. Probed once per line and
 * remembered, so a page full of speakers costs one request per distinct clip.
 */
export async function hasClip(locale: string, audioId: string | null): Promise<boolean> {
  return (await clipUrl(locale, audioId)) !== null;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/**
 * How good a voice is likely to sound, from its name.
 *
 * Every browser ships several voices per language and they are not remotely
 * equal: Edge's "Natural" and Chrome's "Google español" voices are recorded
 * neural models, Apple's Enhanced and Premium downloads are close behind, and
 * at the bottom sit Apple's bundled Compact voices, Microsoft's legacy SAPI
 * "Desktop" voices and eSpeak on Linux, which is a formant synthesiser from the
 * nineties. Picking blindly gets you one of the last three about as often as
 * not, which is what "the Spanish voice is really bad" sounds like.
 *
 * Names are all we have to go on — the API exposes no quality field — but the
 * engines label themselves consistently enough for this to be reliable. An
 * unrecognised name scores zero and sits between the good and the bad, so a
 * voice this list has never heard of is neither promoted nor punished.
 */
const VOICE_MARKS: [RegExp, number][] = [
  [/\bnatural\b|\bneural\b/i, 6], // Edge / Windows 11 neural voices
  [/^google\b|\bgoogle\b/i, 5], // Chrome and Android's cloud voices
  [/\bpremium\b|\benhanced\b|\bsiri\b/i, 4], // Apple's downloadable voices
  [/\bcompact\b/i, -6], // Apple's bundled low-bitrate voices
  [/\bdesktop\b/i, -4], // Microsoft SAPI5, pre-neural
  [/espeak|\bmbrola\b/i, -9], // Linux fallback: intelligible, not human
];

/**
 * Voices an edition would rather not use, however well they score otherwise.
 *
 * Chrome's "Google svenska" is the voice Google Maps reads directions in, and
 * it lands on Swedish like a satnav rather than a person — which is a bad way
 * to be taught how a language sounds. The generic ranking promotes it, because
 * for most languages a Google voice is the best one on the machine; Swedish is
 * the exception.
 *
 * A penalty rather than a ban. It has to lose to any other voice installed, but
 * on a device where it is the *only* Swedish voice — most Android phones — it
 * is still better than silence.
 */
const AVOIDED: Record<string, RegExp> = {
  "sv-SE": /google/i,
};

function voiceScore(voice: SpeechSynthesisVoice, locale: string): number {
  let score = 0;
  for (const [pattern, weight] of VOICE_MARKS) {
    if (pattern.test(voice.name)) score += weight;
  }
  if (AVOIDED[locale]?.test(voice.name)) score -= 20;
  // A Mexican voice reading Madrid slang is wrong in a way a learner will copy,
  // so the exact edition outranks everything except an outright bad engine.
  if (normaliseLang(voice.lang) === locale.toLowerCase()) score += 3;
  return score;
}

function normaliseLang(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

/**
 * The best available voice for a language.
 *
 * Voices load asynchronously in some browsers, so the list is read fresh every
 * time rather than cached at import. Any voice for the language is a candidate
 * — "de-AT" reading German beats an American voice attempting it — and they are
 * then ranked by `voiceScore`.
 *
 * This used to prefer `localService` voices, on the reasoning that a local one
 * plays instantly and offline. That was backwards: on every desktop platform
 * the local voices are the *old* ones, and the good voice — "Google español de
 * España", Edge's "Elvira Natural" — is the one served over the network. The
 * preference was reliably choosing the worst voice on the machine.
 */
function voiceFor(locale: string): SpeechSynthesisVoice | null {
  const engine = synth();
  if (!engine) return null;

  const language = locale.split("-")[0].toLowerCase();
  const matches = engine
    .getVoices()
    .filter((v) => normaliseLang(v.lang).startsWith(language));
  if (matches.length === 0) return null;

  let best = matches[0];
  let bestScore = voiceScore(best, locale);
  for (const voice of matches.slice(1)) {
    const score = voiceScore(voice, locale);
    // Strictly greater, so the browser's own default order breaks ties — it is
    // usually the platform's preferred voice for the language.
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Whether this device can say anything in this language, right now.
 *
 * Strict on purpose: a browser with no German voice installed and no clips
 * generated should show no speaker at all rather than a button that silently
 * does nothing. An empty voice list is not taken as "probably fine in a
 * moment" — see `onVoicesReady` for how the wait is handled instead.
 */
export function canSpeak(locale: string): boolean {
  return voiceFor(locale) !== null;
}

/**
 * Calls back when the voice list changes, so a caller can re-check `canSpeak`.
 *
 * The `voiceschanged` event covers most browsers, but not all of them fire it —
 * some populate the list quietly a moment after load, and one that never fires
 * would leave every speaker hidden forever. So the event is backed by a few
 * checks on a timer, which stop once the list is populated and in any case
 * within two seconds. Nothing here polls indefinitely.
 */
const VOICE_RECHECKS = [120, 400, 900, 1800];

export function onVoicesReady(listener: () => void): () => void {
  const engine = synth();
  if (!engine) return () => {};

  const timers = VOICE_RECHECKS.map((delay) =>
    setTimeout(() => {
      if (engine.getVoices().length > 0) listener();
    }, delay)
  );

  const stopTimers = () => timers.forEach(clearTimeout);
  if (typeof engine.addEventListener !== "function") return stopTimers;

  engine.addEventListener("voiceschanged", listener);
  return () => {
    stopTimers();
    engine.removeEventListener("voiceschanged", listener);
  };
}

/**
 * Where a line is being spoken from.
 *
 * This existed to keep an A/B honest: the recorded Swedish voice was on trial,
 * so the scenario pages played the clips while practice stayed on the device
 * voice, and the same line could be heard both ways on one phone.
 *
 * That trial is over. German and Swedish are both on one recorded voice now,
 * so every surface plays whatever clips exist — and it matters most on the two
 * that were excluded, because Talk Mode speaks a line to you before you have
 * asked for it. Leaving those on the device voice meant a learner heard the
 * recorded voice on the scenario page and whatever their phone happened to
 * ship with everywhere the app actually talks.
 *
 * The parameter stays because the next voice trial will want it, and because
 * every call site already passes it. A surface missing from the list is a
 * surface on the device voice, which is the knob the whole thing is for.
 */
export type Surface = "scenarios" | "practice";

const CLIPS_ENABLED_ON: readonly Surface[] = ["scenarios", "practice"];

let playing: HTMLAudioElement | null = null;

/**
 * Bumped by everything that starts or stops a line.
 *
 * A queued line checks the number it was queued under before it opens its
 * mouth: tapping a speaker button, leaving the screen or answering the next
 * question all move it on, and anything still waiting its turn under the old
 * one drops out rather than talking over whatever is happening now.
 */
let generation = 0;

/** Stops whatever is currently being said. */
export function stopSpeaking(): void {
  generation++;
  if (playing) {
    playing.pause();
    playing = null;
  }
  synth()?.cancel();
}

/**
 * Says `text` in `locale`, from a clip where one exists.
 *
 * Resolves to whether anything actually played, so a caller can decide not to
 * offer the control again. Never throws: a blocked autoplay, a missing voice or
 * a browser with no speech at all are all just silence.
 */
export async function speak(
  locale: string,
  audioId: string | null,
  text: string,
  surface: Surface = "scenarios",
  options: { untilDone?: boolean } = {}
): Promise<boolean> {
  if (!voiceEnabled() || !text.trim()) return false;

  // Whatever was mid-sentence is abandoned. Two lines over each other is worse
  // than either of them, and a learner tapping twice means "say it again".
  stopSpeaking();
  const mine = generation;

  const url = CLIPS_ENABLED_ON.includes(surface) ? await clipUrl(locale, audioId) : null;
  if (mine !== generation) return false;
  if (url) {
    try {
      const audio = new Audio(url);
      playing = audio;
      const finished = new Promise<void>((resolve) => {
        const done = () => {
          if (playing === audio) playing = null;
          resolve();
        };
        audio.addEventListener("ended", done);
        audio.addEventListener("error", done);
        // A pause is `stopSpeaking`, which is a caller who no longer wants
        // whatever was going to follow this line either.
        audio.addEventListener("pause", done);
      });
      await audio.play();
      if (options.untilDone) await finished;
      return true;
    } catch {
      // Autoplay policy, or a file that 404s between the probe and the play.
      // Fall through to the speech engine rather than going silent.
      playing = null;
    }
  }

  const engine = synth();
  const voice = voiceFor(locale);
  if (!engine || !voice) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text, locale));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    // Slightly under conversational pace. These are lines to copy, and the
    // learner is hearing the language for the first time.
    utterance.rate = 0.92;
    const finished = new Promise<void>((resolve) => {
      utterance.addEventListener("end", () => resolve());
      utterance.addEventListener("error", () => resolve());
    });
    engine.speak(utterance);
    if (options.untilDone) await finished;
    return true;
  } catch {
    return false;
  }
}

/**
 * Says several lines in order, waiting for each before starting the next.
 *
 * A conversation is two people, and hearing "¿Qué te pongo?" and your own
 * answer on top of each other teaches neither. Anything that starts a new line
 * mid-queue — tapping a speaker, answering, leaving the screen — abandons what
 * was still waiting rather than saying it late.
 */
export async function speakInTurn(
  locale: string,
  lines: { audioId: string | null; text: string }[],
  surface: Surface = "scenarios"
): Promise<void> {
  for (const line of lines) {
    if (!line.text.trim()) continue;
    const before = generation;
    await speak(locale, line.audioId, line.text, surface, { untilDone: true });
    // `speak` bumps the generation itself, so the check is against what this
    // line's own call left behind: anything else since means stop.
    if (generation !== before + 1) return;
  }
}

/**
 * Editions that speak only the first of several ways to say a line.
 *
 * " / " with spaces around it separates two ways of saying the same thing —
 * "Var är tuben? / Var är Tunnelbanan?" — and reading both has the voice repeat
 * itself in different words, which is most of what makes a synthesiser sound
 * like a machine. It grates worst in Swedish, where the best voice most devices
 * have is the flat navigation one, so Swedish says the first variant and stops.
 *
 * Spanish and German read the alternatives as authored: their voices carry the
 * repetition well enough, and hearing the second way of putting it is worth
 * something in its own right. This is a preference per edition rather than a
 * rule, which is why it is a list and not an `if`.
 */
const SPEAKS_ONE_ALTERNATIVE = new Set(["sv-SE"]);

const ALTERNATIVE_LINES = /\s+\/\s+/;

/**
 * Prepares a written line to be read aloud.
 *
 * A slash *without* spaces joins alternatives inside one phrase —
 * "Links/rechts", "Gröna/röda/blå linjen" — where all of them belong in the
 * sentence, so those become a short pause in every edition. And a fill-in slot
 * stands in for an address or an amount: read literally it comes out as
 * "underscore underscore", so it is dropped and the sentence around it is still
 * worth hearing.
 */
function stripForSpeech(text: string, locale: string): string {
  let line = text;
  if (SPEAKS_ONE_ALTERNATIVE.has(locale)) {
    const [first] = text.split(ALTERNATIVE_LINES);
    if (first?.trim()) line = first;
  }

  return line
    .replace(/\[[^\]]*\]/g, " … ")
    .replace(/_{2,}/g, " … ")
    .replace(/\s*\/\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}
