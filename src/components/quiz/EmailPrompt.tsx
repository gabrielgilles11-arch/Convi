import { useState, type SubmitEvent } from "react";

/**
 * The one ask, after five rounds.
 *
 * Deliberately late. Asking a stranger for an email before they have used
 * anything is the highest-friction moment there is; asking someone who has
 * just finished their fifth round is a different question entirely, because
 * by then they have answered forty-odd questions and know what this is.
 *
 * Just as deliberately easy to refuse. The X is a real target rather than a
 * gray speck in a corner, dismissing it is remembered forever, and nothing
 * about the app changes whether it is answered or ignored — there is nothing
 * behind it to unlock.
 */

interface Props {
  onClose: () => void;
  /** Called once an address has actually been accepted. */
  onRegistered: () => void;
}

export default function EmailPrompt({ onClose, onRegistered }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("rejected");
      setDone(true);
      onRegistered();
    } catch {
      setError("That didn't go through. Check the address and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="email-prompt" role="dialog" aria-modal="true" aria-labelledby="email-prompt-title">
      <div className="email-prompt-card">
        <button type="button" className="email-prompt-close" onClick={onClose} aria-label="No thanks, close this">
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
            <h2 id="email-prompt-title">You're on the list.</h2>
            <p className="email-prompt-sub">
              We'll email you when the app lands. Back to it.
            </p>
            <button type="button" className="email-prompt-submit" onClick={onClose}>
              Keep practicing
            </button>
          </>
        ) : (
          <>
            <h2 id="email-prompt-title">Enjoying Try Convi?</h2>
            <p className="email-prompt-sub">
              Register with an email and we'll tell you the moment the app is
              ready. Everything here stays free either way.
            </p>

            <form className="email-prompt-form" onSubmit={submit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-label="Your email address"
              />
              <button type="submit" className="email-prompt-submit" disabled={sending || !email.trim()}>
                {sending ? "Sending…" : "Register"}
              </button>
            </form>

            {error && <p className="email-prompt-error">{error}</p>}

            <button type="button" className="email-prompt-skip" onClick={onClose}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
