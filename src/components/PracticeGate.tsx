import { useEffect, useState, type FormEvent } from "react";
import QuizApp from "./quiz/QuizApp";
import "./practiceGate.css";

const UNLOCK_KEY = "convi:unlocked:v1";
const GUMROAD_PRODUCT_URL = "https://gabrio136.gumroad.com/l/kfmoj";

export default function PracticeGate() {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUnlocked(localStorage.getItem(UNLOCK_KEY) === "true");
    setChecked(true);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://gumroad.com/js/gumroad.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
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
        localStorage.setItem(UNLOCK_KEY, "true");
        setUnlocked(true);
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
    return <QuizApp />;
  }

  return (
    <div className="practice-gate">
      <h2>Unlock Practice</h2>
      <p>
        Get full access to flashcards and multiple-choice quizzes across every scenario — one-time
        payment, yours forever.
      </p>
      <a className="gumroad-button gate-buy" href={GUMROAD_PRODUCT_URL}>
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
