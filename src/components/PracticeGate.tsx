import { useEffect, useState, type SubmitEvent } from "react";
import QuizApp from "./quiz/QuizApp";
import { PAYWALL_ENABLED } from "../lib/paywall";
import "./practiceGate.css";

const GUMROAD_PRODUCT_URL = "https://gabrio136.gumroad.com/l/kfmoj";

interface Props {
  locale?: string; // which language's practice deck this gate fronts
}

export default function PracticeGate({ locale }: Props) {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Nothing to check when nothing is gated — and asking anyway would put a
    // request in front of every practice session for an answer that cannot
    // change. The gate below is left whole for when the flag goes back on.
    if (!PAYWALL_ENABLED) {
      setUnlocked(true);
      setChecked(true);
      return;
    }

    fetch("/api/entitlement")
      .then((res) => res.json())
      .then((data) => setUnlocked(!!data.entitled))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  async function handleVerify(event: SubmitEvent) {
    event.preventDefault();
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/check-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.unlocked) {
        setUnlocked(true);
      } else if (data.reason === "device_limit") {
        setError(
          "This purchase is already active on 2 devices. Use one of those, or email hello@tryconvi.com for help."
        );
      } else {
        setError("We couldn't find a purchase for that email. Double-check it and try again.");
      }
    } catch {
      setError("Couldn't verify right now. Check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (!checked) return null;

  if (unlocked) {
    return <QuizApp locale={locale} />;
  }

  return (
    <div className="practice-gate">
      <h2>Unlock Practice</h2>
      <p>
        Get full access to Practice: a guided path through every scenario, in rounds of ten, with
        typed answers, word building and multiple choice. One-time payment, yours forever.
      </p>
      <p className="gate-all-langs">
        <span className="gate-flags" aria-hidden="true">
          🇪🇸 🇸🇪 🇩🇪
        </span>
        One purchase unlocks <strong>all three languages</strong> (Spanish, Swedish and German),
        plus every members-only scenario pack.
      </p>
      <a className="gate-buy" href={GUMROAD_PRODUCT_URL} target="_blank" rel="noopener">
        Buy
      </a>

      <p className="gate-divider">Already purchased?</p>

      <form className="gate-license-form" onSubmit={handleVerify}>
        <input
          type="email"
          placeholder="Enter the email you paid with"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" disabled={verifying}>
          {verifying ? "Checking…" : "Unlock"}
        </button>
      </form>
      {error && <p className="gate-error">{error}</p>}
    </div>
  );
}
