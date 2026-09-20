import { useEffect, useState, type SubmitEvent } from "react";
import {
  enableEmailReminders,
  enablePush,
  fetchReminderConfig,
  pushSupported,
  type ReminderConfig,
} from "../../lib/reminderClient";

/**
 * The one ask about coming back, offered after the first section is cleared.
 *
 * That moment rather than an earlier one because it is the first time somebody
 * has finished something: there is a streak to protect and a next section to
 * come back to, so "shall we remind you" is a question about their own plan
 * rather than a request from a stranger.
 *
 * Refusing is a first-class outcome. The X is a real target, "No thanks" says
 * what it does, and either is remembered forever — nothing here asks twice.
 * Nothing is gated behind saying yes and nothing changes if you don't.
 *
 * Two channels, offered in the order that costs the reader least. Push is a tap
 * and arrives without an address; email is the fallback for the browsers that
 * cannot do push at all, which on iOS is every browser outside an installed
 * home-screen app.
 */
interface Props {
  /** Edition being practised, so a reminder opens the right one. */
  locale: string;
  /** Current day streak, so the first nudge can name it. */
  streak: number;
  onClose: () => void;
  /** Called once a channel is actually live. */
  onEnabled: (channel: "push" | "email") => void;
}

type Stage = "ask" | "email" | "done-push" | "done-email";

export default function RemindPrompt({ locale, streak, onClose, onEnabled }: Props) {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [stage, setStage] = useState<Stage>("ask");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchReminderConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing can be stored, so there is nothing honest to offer. Closing rather
  // than rendering a dead card, and not marked as answered — the ask survives
  // until it can actually be made.
  useEffect(() => {
    if (config && !config.available) onClose();
  }, [config, onClose]);

  if (!config || !config.available) return null;

  const canPush = config.push && pushSupported();

  async function turnOnPush() {
    setError("");
    setBusy(true);
    try {
      const outcome = await enablePush(config!.vapidPublicKey!, { locale, streak });
      if (outcome === "subscribed") {
        setStage("done-push");
        onEnabled("push");
        return;
      }
      // A refused permission prompt cannot be raised again from here, so the
      // only useful thing left to offer is the other channel.
      setStage("email");
      setError(
        outcome === "denied"
          ? "Notifications are blocked for this site. An email works just as well."
          : "That didn't go through. Want an email instead?"
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const ok = await enableEmailReminders(email.trim(), { locale, streak });
      if (ok) {
        setStage("done-email");
        onEnabled("email");
      } else {
        setError("That didn't go through. Check the address and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const done = stage === "done-push" || stage === "done-email";

  return (
    <div
      className="email-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remind-prompt-title"
    >
      <div className="email-prompt-card">
        <button
          type="button"
          className="email-prompt-close"
          onClick={onClose}
          aria-label="No thanks, close this"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 6 L18 18 M18 6 L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {done ? (
          <>
            <h2 id="remind-prompt-title">Done. We'll nudge you.</h2>
            <p className="email-prompt-sub">
              {stage === "done-push"
                ? "One notification if you go quiet for a couple of days, and never more than four in a row."
                : "One email if you go quiet for a couple of days, and never more than four in a row. Every one of them has a one-click way out."}
            </p>
            <button type="button" className="email-prompt-submit" onClick={onClose}>
              Keep practising
            </button>
          </>
        ) : stage === "email" || !canPush ? (
          <>
            <h2 id="remind-prompt-title">Want a nudge by email?</h2>
            <p className="email-prompt-sub">
              {canPush
                ? "We'll only write when you've been away a couple of days."
                : "This browser can't do notifications, but an email does the same job. We'll only write when you've been away a couple of days."}
            </p>

            <form className="email-prompt-form" onSubmit={submitEmail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-label="Your email address"
              />
              <button
                type="submit"
                className="email-prompt-submit"
                disabled={busy || !email.trim()}
              >
                {busy ? "Saving…" : "Remind me"}
              </button>
            </form>

            {error && <p className="email-prompt-error">{error}</p>}

            <button type="button" className="email-prompt-skip" onClick={onClose}>
              No thanks
            </button>
          </>
        ) : (
          <>
            <h2 id="remind-prompt-title">First section cleared.</h2>
            <p className="email-prompt-sub">
              {streak > 0
                ? `You're ${streak} day${streak === 1 ? "" : "s"} in. Want a nudge if the streak's about to break?`
                : "Want a nudge if you go quiet for a couple of days?"}
            </p>

            <button
              type="button"
              className="email-prompt-submit remind-primary"
              onClick={turnOnPush}
              disabled={busy}
            >
              {busy ? "Asking…" : "Yes, remind me"}
            </button>

            {/* Said before the permission prompt appears, not after: the browser's
                own dialogue says nothing about how often or how to stop. */}
            <p className="remind-terms">
              At most four nudges, then we stop on our own. Off again any time, in
              one tap.
            </p>

            <button type="button" className="email-prompt-skip" onClick={() => setStage("email")}>
              Email me instead
            </button>
            <button type="button" className="email-prompt-skip" onClick={onClose}>
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
