import { useEffect, useState } from "react";

/**
 * Speaker button for a line of the target language.
 *
 * Audio is generated at author time (scripts/generate-audio.mjs) and committed,
 * so a clip either exists or it doesn't. Rather than render a button that might
 * fail, this probes once and shows nothing when there's no file — which is also
 * how the feature stays invisible until the audio is actually generated.
 */

/**
 * Audio is switched off for now. The generator hasn't been run, and without
 * this flag the speakers would appear on their own the moment any clip landed
 * in public/audio — flip it to true when the audio is generated and checked.
 */
const AUDIO_ENABLED = false;

// Probe results are shared across every button and survive question changes.
const known = new Map<string, string | null>();

async function resolve(base: string): Promise<string | null> {
  if (known.has(base)) return known.get(base)!;
  for (const ext of ["mp3", "wav"]) {
    const url = `${base}.${ext}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        known.set(base, url);
        return url;
      }
    } catch {
      // network hiccup — treat as absent, it'll be re-probed next mount
    }
  }
  known.set(base, null);
  return null;
}

interface Props {
  locale: string;
  audioId: string | null;
  label?: string;
}

export default function AudioButton({ locale, audioId, label = "Hear it" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!AUDIO_ENABLED || !audioId) {
      setUrl(null);
      return;
    }
    resolve(`/audio/${locale}/${audioId}`).then((found) => {
      if (!cancelled) setUrl(found);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, audioId]);

  if (!AUDIO_ENABLED || !url) return null;

  return (
    <button
      type="button"
      className="audio-button"
      aria-label={label}
      title={label}
      onClick={() => {
        void new Audio(url).play().catch(() => {});
      }}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M4 8h3l4-3.5v11L7 12H4z" fill="currentColor" />
        <path
          d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.8 5.2a6.5 6.5 0 0 1 0 9.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
