import { useState, type FormEvent } from "react";
import "./practiceGate.css";

const GUMROAD_PRODUCT_URL = "https://gabrio136.gumroad.com/l/kfmoj";

export default function ScenarioGate() {
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

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
        // Reload so the server renders the now-unlocked content.
        window.location.reload();
        return;
      }
      if (data.reason === "device_limit") {
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
