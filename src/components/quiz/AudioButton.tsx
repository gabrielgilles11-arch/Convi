import { useEffect, useState } from "react";
import {
  canSpeak,
  hasClip,
  onVoicesReady,
  speak,
  subscribeVoice,
  voiceEnabled,
  type Surface,
} from "./speech";

/**
 * Speaker button for a line of the target language.
 *
 * It plays a generated clip where one exists and falls back to the device's own
 * voice, so it appears as soon as either can say the line — see ./speech. When
 * neither can, it renders nothing rather than a control that does nothing.
 */

interface Props {
  locale: string;
  /** Id of the generated clip, when the line has one. */
  audioId: string | null;
  /** The line itself, for the fallback voice. */
  text: string;
  label?: string;
  /** Which surface this button belongs to — see Surface in ./speech. */
  surface?: Surface;
}

export default function AudioButton({
  locale,
  audioId,
  text,
  label = "Hear it",
  surface = "practice",
}: Props) {
  // Both facts live outside React — one in localStorage, one in the browser's
  // voice list — so they are read after mount, never during render. Starting
  // false also keeps the server's HTML and the first client render identical.
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // A device voice is enough on its own, so the button doesn't wait on the
    // clip probe to appear. A clip id alone is not: every line has one, and
    // most lines in most editions have no recording behind it, so on a device
    // with no voice for the language it was a button that did nothing.
    let clip = false;
    let live = true;
    const check = () => {
      if (live) setAvailable(voiceEnabled() && (clip || canSpeak(locale)));
    };
    check();
    void hasClip(locale, audioId).then((found) => {
      clip = found;
      check();
    });
    const stopWatchingVoices = onVoicesReady(check); // list can arrive late
    const stopWatchingSetting = subscribeVoice(check);
    return () => {
      live = false;
      stopWatchingVoices();
      stopWatchingSetting();
    };
  }, [locale, audioId]);

  if (!available || !text.trim()) return null;

  return (
    <button
      type="button"
      className={`audio-button${speaking ? " is-speaking" : ""}`}
      aria-label={label}
      title={label}
      onClick={(event) => {
        // The line itself is often clickable too; one tap should say it once.
        event.stopPropagation();
        setSpeaking(true);
        void speak(locale, audioId, text, surface).finally(() => setSpeaking(false));
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
