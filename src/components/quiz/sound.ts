/**
 * Answer feedback tones.
 *
 * Synthesised with the Web Audio API rather than loaded from files: two short
 * tones are a few lines of maths, where shipping them as audio would mean
 * binary assets in the repo, two more requests per round, and another entry in
 * the CSP. Nothing here touches the network.
 *
 * Browsers start an AudioContext suspended until the page has been interacted
 * with. That costs nothing here — the first sound only ever plays in response
 * to answering a question, which is itself the gesture that unlocks it.
 */

const STORAGE_KEY = "convi:sound:v1";

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    // Some browsers throw when audio is blocked outright. Silence is fine.
    return null;
  }
}

/** Sound is on unless the learner has turned it off. */
export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode — the setting just won't survive the session.
  }
}

interface ToneSpec {
  /** Hz at the start of the tone. */
  from: number;
  /** Hz at the end, when it should slide. Defaults to `from`. */
  to?: number;
  /** Seconds after the call before it sounds. */
  delay: number;
  duration: number;
  peak: number;
  type: OscillatorType;
}

function play(specs: ToneSpec[]): void {
  const c = audioContext();
  if (!c) return;
  const now = c.currentTime;

  for (const s of specs) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = now + s.delay;
    const end = start + s.duration;

    osc.type = s.type;
    osc.frequency.setValueAtTime(s.from, start);
    if (s.to && s.to !== s.from) osc.frequency.exponentialRampToValueAtTime(s.to, end);

    // Ramped in and out. Switching gain on and off squarely puts a step in the
    // waveform, which is audible as a click on either end of the tone.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(s.peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(end + 0.03);
  }
}

/** Two rising notes — A5 up to E6. Short and quiet enough to hear all day. */
export function playCorrect(): void {
  if (!soundEnabled()) return;
  play([
    { from: 880, delay: 0, duration: 0.11, peak: 0.12, type: "sine" },
    { from: 1318.5, delay: 0.085, duration: 0.16, peak: 0.1, type: "sine" },
  ]);
}

/** One low tone sliding down. Blunt rather than harsh — it marks a miss, not a disaster. */
export function playWrong(): void {
  if (!soundEnabled()) return;
  play([{ from: 220, to: 155, delay: 0, duration: 0.26, peak: 0.11, type: "triangle" }]);
}
