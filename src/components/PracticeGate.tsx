import { useEffect, useState, type FormEvent } from "react";
import QuizApp from "./quiz/QuizApp";
import "./practiceGate.css";

const UNLOCK_KEY = "convi:unlocked:v1";
const GUMROAD_PRODUCT_URL = "https://gabrio136.gumroad.com/l/kfmoj";
const GUMROAD_PRODUCT_ID = "ZGWReIV6wROcohJeSiJF7A==";

export default function PracticeGate() {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
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
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_id: GUMROAD_PRODUCT_ID,
          license_key: licenseKey.trim(),
          increment_uses_count: "false",
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(UNLOCK_KEY, "true");
        setUnlocked(true);
      } else {
        setError(data.message || "That license key didn't work. Double-check it and try again.");
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
          type="text"
          placeholder="Enter your license key"
          value={licenseKey}
          onChange={(event) => setLicenseKey(event.target.value)}
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
