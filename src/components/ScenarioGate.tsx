import { useEffect, useState, type FormEvent } from "react";
import "./practiceGate.css";

const UNLOCK_KEY = "convi:unlocked:v1";
const GUMROAD_PRODUCT_URL = "https://gabrio136.gumroad.com/l/kfmoj";

function revealContent() {
  document.getElementById("premium-content")?.classList.remove("locked");
}

export default function ScenarioGate() {
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem(UNLOCK_KEY) === "true") {
      setUnlocked(true);
      revealContent();
    }
    setChecked(true);
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
        revealContent();
      } else {
        setError("We couldn't find a purchase for that email. Double-check it and try again.");
      }
    } catch {
      setError("Couldn't verify right now. Check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (!checked || unlocked) return null;

  return (
    <div className="practice-gate">
      <h2>This one's part of the paid pack</h2>
      <p>
        Cuss words, flirting, nightlife, emergencies and the hungover pack unlock with a one-time
        purchase — the same buy that unlocks Practice. Yours forever.
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
