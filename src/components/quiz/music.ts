/**
 * Game Mode's background music.
 *
 * Synthesised with the Web Audio API, the same way sound.ts makes its tones:
 * no audio files, no requests, nothing new in the CSP. Each edition has its
 * own loop in the spirit of the reels' soundtracks: a Spanish rumba on nylon
 * strings and palmas, a Bavarian oompah with tuba and accordion, and a bright
 * Swedish pop beat.
 *
 * It sits well under the voices. Whenever a line is being said the music dips
 * (`duckMusic`), and it stops outright in a hidden tab, because music from a
 * tab you cannot see is the fastest way to get a site muted for good.
 *
 * Browsers will not start audio without a gesture, so `startMusic` is only
 * ever called from a click (Start, or the music button itself).
 */

export type MusicStyle = "es" | "de" | "se";

const STORAGE_KEY = "convi:music:v1";
/** Loud enough to feel, quiet enough to talk over. */
const VOLUME = 0.11;
/** The level while somebody is speaking, as a share of VOLUME. */
const DUCKED = 0.3;

export function musicEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setMusicEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the setting lasts as long as the tab.
  }
  if (!on) stopMusic();
}

// ---------------------------------------------------------------------------
// The audio graph
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let duck: GainNode | null = null;
let timer = 0;
let style: MusicStyle | null = null;
let step = 0;
let nextTime = 0;
let watchingVisibility = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0;
      duck = ctx.createGain();
      duck.gain.value = 1;
      // A gentle top cut so nothing in the loop is ever harsh.
      const soften = ctx.createBiquadFilter();
      soften.type = "lowpass";
      soften.frequency.value = 6500;
      master.connect(duck).connect(soften).connect(ctx.destination);
    }
    return ctx;
  } catch {
    return null;
  }
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Plucked string by Karplus-Strong, rendered once per note and reused. */
const plucks = new Map<number, AudioBuffer>();
function pluckBuffer(c: AudioContext, note: number): AudioBuffer {
  const cached = plucks.get(note);
  if (cached) return cached;
  const rate = c.sampleRate;
  const length = Math.floor(rate * 1.1);
  const buffer = c.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(rate / midi(note)));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0; i < length; i++) {
    const j = i % period;
    const next = ring[(j + 1) % period]!;
    data[i] = ring[j]!;
    ring[j] = 0.996 * 0.5 * (ring[j]! + next);
  }
  plucks.set(note, buffer);
  return buffer;
}

function pluck(c: AudioContext, note: number, t: number, gain: number): void {
  const src = c.createBufferSource();
  src.buffer = pluckBuffer(c, note);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
  src.connect(g).connect(master!);
  src.start(t);
  src.stop(t + 1.1);
}

function tone(
  c: AudioContext,
  note: number,
  t: number,
  dur: number,
  gain: number,
  type: OscillatorType,
  opts: { cutoff?: number; detune?: number; attack?: number } = {}
): void {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(midi(note), t);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, t);
  const g = c.createGain();
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out: AudioNode = g;
  if (opts.cutoff) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.cutoff;
    g.connect(f);
    out = f;
  }
  osc.connect(g);
  out.connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let noise: AudioBuffer | null = null;
function hit(c: AudioContext, t: number, gain: number, freq: number, dur: number, q = 1): void {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function kick(c: AudioContext, t: number, gain: number): void {
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.2);
}

// ---------------------------------------------------------------------------
// The three loops
// ---------------------------------------------------------------------------

interface Loop {
  bpm: number;
  /** Steps per bar; a step is an eighth note. */
  steps: number;
  /** Chords, one per bar, as MIDI notes (root first). */
  chords: number[][];
  play: (
    c: AudioContext,
    s: number,
    chord: number[],
    bar: number,
    t: number,
    stepLength: number
  ) => void;
}

/** Spain: rumba on the Andalusian cadence, Am G F E, with palmas. */
const RUMBA: Loop = {
  bpm: 108,
  steps: 8,
  chords: [
    [57, 60, 64],
    [55, 59, 62],
    [53, 57, 60],
    [52, 56, 59],
  ],
  play(c, s, chord, bar, t, len) {
    const [root] = chord as [number];
    // The rumba strum: on 1, the "and" of 2, and 4.
    if (s === 0 || s === 3 || s === 6) {
      chord.forEach((n, i) => pluck(c, n + 12, t + i * 0.014, s === 0 ? 0.5 : 0.36));
    }
    if (s === 0 || s === 4) pluck(c, root - 12, t, 0.55);
    // Palmas on 2 and 4, a softer ghost before each.
    if (s === 2 || s === 6) hit(c, t, 0.32, 1900, 0.09, 0.8);
    if (s === 5 || s === 7) hit(c, t, 0.1, 2300, 0.05, 0.8);
    // A little melody over every other bar, from the chord's own notes.
    if (bar % 2 === 1 && (s === 1 || s === 2 || s === 5)) {
      const top = chord[(s + bar) % chord.length]! + 24;
      pluck(c, top, t, 0.26);
    }
    void len;
  },
};

/** Bavaria: oompah in F, tuba on the beat, accordion on the off. */
const OOMPAH: Loop = {
  bpm: 112,
  steps: 4,
  chords: [
    [53, 57, 60],
    [53, 57, 60],
    [48, 52, 55],
    [48, 52, 55],
    [53, 57, 60],
    [58, 62, 65],
    [48, 52, 55],
    [53, 57, 60],
  ],
  play(c, s, chord, bar, t, len) {
    const [root] = chord as [number];
    if (s === 0) tone(c, root - 12, t, len * 1.6, 0.42, "triangle");
    if (s === 2) tone(c, root - 5, t, len * 1.6, 0.36, "triangle");
    if (s === 1 || s === 3) {
      for (const n of chord) {
        tone(c, n + 12, t, len * 0.8, 0.07, "sawtooth", { cutoff: 1800, detune: -6 });
        tone(c, n + 12, t, len * 0.8, 0.07, "sawtooth", { cutoff: 1800, detune: 7 });
      }
      hit(c, t, 0.08, 3200, 0.05, 1.2);
    }
    // A glockenspiel line every other bar.
    if (bar % 2 === 0 && (s === 0 || s === 2)) {
      tone(c, chord[(bar / 2 + s / 2) % 3]! + 24, t, 0.5, 0.09, "sine");
    }
  },
};

/** Sweden: bright pop, Am F C G, four on the floor. */
const POP: Loop = {
  bpm: 120,
  steps: 8,
  chords: [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55],
    [55, 59, 62],
  ],
  play(c, s, chord, bar, t, len) {
    const [root] = chord as [number];
    if (s % 2 === 0) kick(c, t, 0.55);
    if (s === 2 || s === 6) hit(c, t, 0.22, 1600, 0.12, 0.7);
    if (s % 2 === 1) hit(c, t, 0.06, 8000, 0.03, 0.5);
    // Octave bass on every eighth.
    tone(c, root - 24 + (s % 2 ? 12 : 0), t, len * 0.9, 0.2, "square", { cutoff: 700 });
    // The arpeggio that makes it pop.
    const arp = [0, 1, 2, 1, 2, 1, 0, 2][s]!;
    tone(c, chord[arp]! + 12, t, len * 0.85, 0.06, "square", { cutoff: 2600 });
    if (s === 0)
      for (const n of chord)
        tone(c, n, t, len * 7.5, 0.035, "sawtooth", { cutoff: 1200, attack: 0.2 });
    if (bar % 4 === 3 && s >= 4) tone(c, chord[s % 3]! + 24, t, len * 0.9, 0.05, "triangle");
  },
};

const LOOPS: Record<MusicStyle, Loop> = { es: RUMBA, de: OOMPAH, se: POP };

// ---------------------------------------------------------------------------
// Playing
// ---------------------------------------------------------------------------

/** Schedules a little ahead of time, so a busy main thread never drops a beat. */
const LOOKAHEAD = 0.25;

function schedule(): void {
  const c = ctx;
  if (!c || !style) return;
  const loop = LOOPS[style];
  const stepLength = 60 / loop.bpm / 2;
  while (nextTime < c.currentTime + LOOKAHEAD) {
    const bar = Math.floor(step / loop.steps);
    const s = step % loop.steps;
    const chord = loop.chords[bar % loop.chords.length]!;
    loop.play(c, s, chord, bar, nextTime, stepLength);
    nextTime += stepLength;
    step++;
  }
}

function onVisibility(): void {
  if (!ctx) return;
  if (document.hidden) {
    void ctx.suspend().catch(() => {});
  } else if (style) {
    void ctx.resume().catch(() => {});
    // Pick up from now rather than racing to catch up on missed steps.
    nextTime = ctx.currentTime + 0.05;
  }
}

/** Starts (or switches to) a loop. A no-op when music is turned off. */
export function startMusic(next: MusicStyle): void {
  if (!musicEnabled()) return;
  const c = context();
  if (!c || !master) return;
  void c.resume().catch(() => {});
  if (style === next && timer) return;
  if (timer) window.clearInterval(timer);
  style = next;
  step = 0;
  nextTime = c.currentTime + 0.08;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(master.gain.value, c.currentTime);
  master.gain.linearRampToValueAtTime(VOLUME, c.currentTime + 1.2);
  timer = window.setInterval(schedule, 60);
  schedule();
  if (!watchingVisibility) {
    document.addEventListener("visibilitychange", onVisibility);
    watchingVisibility = true;
  }
}

/** Fades out and stops. */
export function stopMusic(): void {
  if (timer) window.clearInterval(timer);
  timer = 0;
  style = null;
  if (ctx && master) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.4);
  }
}

/** Dips the music under a voice, and brings it back after. */
export function duckMusic(on: boolean): void {
  if (!ctx || !duck) return;
  const now = ctx.currentTime;
  duck.gain.cancelScheduledValues(now);
  duck.gain.setTargetAtTime(on ? DUCKED : 1, now, on ? 0.08 : 0.35);
}

export function musicPlaying(): boolean {
  return timer !== 0;
}
