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
 * The best installed voice for a language.
 *
 * Voices load asynchronously in some browsers, so the list is read fresh every
 * time rather than cached at import. An exact locale match wins; failing that
 * any voice for the same language, since "de-AT" reading German is far better
 * than an American voice attempting it. A local voice is preferred over a
 * network one so the line plays instantly and offline.
 */
function voiceFor(locale: string): SpeechSynthesisVoice | null {
  const engine = synth();
  if (!engine) return null;

  const voices = engine.getVoices();
  if (voices.length === 0) return null;

  const language = locale.split("-")[0].toLowerCase();
  const matches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(language));
  if (matches.length === 0) return null;

  const exact = matches.filter((v) => v.lang.toLowerCase().replace("_", "-") === locale.toLowerCase());
  const pool = exact.length > 0 ? exact : matches;
  return pool.find((v) => v.localService) ?? pool[0];
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

let playing: HTMLAudioElement | null = null;

/** Stops whatever is currently being said. */
export function stopSpeaking(): void {
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
  text: string
): Promise<boolean> {
  if (!voiceEnabled() || !text.trim()) return false;

  // Whatever was mid-sentence is abandoned. Two lines over each other is worse
  // than either of them, and a learner tapping twice means "say it again".
  stopSpeaking();

  const url = await clipUrl(locale, audioId);
  if (url) {
    try {
      const audio = new Audio(url);
      playing = audio;
      audio.addEventListener("ended", () => {
        if (playing === audio) playing = null;
      });
      await audio.play();
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
    const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    // Slightly under conversational pace. These are lines to copy, and the
    // learner is hearing the language for the first time.
    utterance.rate = 0.92;
    engine.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepares a written line to be read aloud.
 *
 * Authored lines carry marks meant for the eye: a slash between two ways of
 * saying the same thing, a fill-in slot standing in for an address. Read
 * literally they come out as "slash" and "underscore underscore", so the slash
 * becomes a pause and the slot is dropped — the sentence around it is still the
 * thing worth hearing.
 */
function stripForSpeech(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, " … ")
    .replace(/_{2,}/g, " … ")
    .replace(/\s*\/\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}
