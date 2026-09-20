import { describe, expect, it } from "vitest";
import { practiceUrl, reminderEmail, unsubscribeUrl } from "../reminderEmail";
import { escapeHtml } from "../email";
import { planNudge, MAX_NUDGES, type ReminderState } from "../reminderPlan";
import { LOCALES, type Locale } from "../content";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 17, 0, 0);
const ID = "b2b2f0c6-7a21-4e55-9a3f-2c7d0d3f9a11";

function nudgeAt(step: number, over: Partial<ReminderState> = {}) {
  return planNudge(
    {
      lastSeen: NOW - 60 * DAY,
      lastSentAt: null,
      sentSinceSeen: step,
      streak: 4,
      language: "Spanish",
      region: "Spain",
      ...over,
    },
    NOW
  )!;
}

const steps = Array.from({ length: MAX_NUDGES }, (_, i) => i);
const locales = LOCALES.map((l) => l.locale);

describe("the reminder email", () => {
  /**
   * The promise the List-Unsubscribe header makes on every send. A reminder
   * somebody cannot stop is the reason a sending domain gets burned, and the
   * last one carries the link too — "we'll stop" is a promise, and an opt-out
   * that depends on a promise being kept is not an opt-out.
   */
  it("carries a working way out, on every rung, in both formats", () => {
    for (const step of steps) {
      const mail = reminderEmail(nudgeAt(step), "es-ES", ID);
      const off = unsubscribeUrl(ID);
      expect(mail.unsubscribeUrl).toBe(off);
      expect(mail.html).toContain(escapeHtml(off));
      expect(mail.text).toContain(off);
    }
  });

  it("puts the id in the link in a form a URL can carry", () => {
    // An id is opaque to us, so it is encoded rather than trusted to be safe.
    expect(unsubscribeUrl("a b&c=d")).toBe(
      "https://tryconvi.com/api/reminders/unsubscribe?id=a%20b%26c%3Dd"
    );
  });

  it("sends people back to the edition they were practising", () => {
    expect(practiceUrl("es-ES")).toBe("https://tryconvi.com/practice");
    expect(practiceUrl("sv-SE")).toBe("https://tryconvi.com/sv/practice");
    expect(practiceUrl("de-DE")).toBe("https://tryconvi.com/de/practice");

    for (const locale of locales) {
      const mail = reminderEmail(nudgeAt(0), locale as Locale, ID);
      expect(mail.html).toContain(practiceUrl(locale as Locale));
    }
  });

  it("has a subject, a heading, a preheader and one button", () => {
    for (const step of steps) {
      const nudge = nudgeAt(step);
      const mail = reminderEmail(nudge, "es-ES", ID);
      expect(mail.subject).toBe(nudge.subject);
      expect(mail.html).toContain(escapeHtml(nudge.title));
      expect(mail.html).toContain(escapeHtml(nudge.preheader));
      expect(mail.html).toContain(escapeHtml(nudge.cta));
      // One call to action. Two is a choice, and a nudge is not a menu.
      expect(mail.html.match(/border-radius:999px;background:#e8622c/g)?.length).toBe(1);
    }
  });

  it("names the edition rather than defaulting to Spanish", () => {
    const swedish = reminderEmail(nudgeAt(0), "sv-SE", ID);
    expect(swedish.html).toContain("Swedish");
    expect(swedish.html).not.toContain("practising Spanish");
  });
});

describe("escapeHtml", () => {
  /**
   * Addresses and ids go into the templates. Neither is written by us, and one
   * of them is typed into a public form.
   */
  it("neutralises anything that could close a tag or an attribute", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(escapeHtml(`a'b&c`)).toBe("a&#39;b&amp;c");
  });

  it("escapes the ampersand first, so nothing is double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
