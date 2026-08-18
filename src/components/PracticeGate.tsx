import { useEffect, useState, type FormEvent } from "react";
import QuizApp from "./quiz/QuizApp";
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
    fetch("/api/entitlement")
      .then((res) => res.json())
      .then((data) => setUnlocked(!!data.entitled))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  async function handleVerify(event: FormEvent) {
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
        Get full access to flashcards and multiple-choice quizzes across every scenario — one-time
        payment, yours forever.
      </p>
      <p className="gate-all-langs">
        <span className="gate-flags" aria-hidden="true">
          🇪🇸 🇸🇪 🇩🇪
        </span>
        One purchase unlocks <strong>all three languages</strong> — Spanish, Swedish and German —
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
