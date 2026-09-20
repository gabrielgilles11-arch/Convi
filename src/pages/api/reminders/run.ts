import type { APIRoute } from "astro";
import {
  dropPush,
  recordNudgeSent,
  remindersConfigured,
  staleSubscribers,
} from "../../../lib/reminders";
import { planNudge, LADDER } from "../../../lib/reminderPlan";
import { sendPush, pushConfigured } from "../../../lib/webpush";
import { emailConfigured, sendEmail } from "../../../lib/email";
import { reminderEmail } from "../../../lib/reminderEmail";
import { getLocaleInfo, localePath } from "../../../lib/content";

export const prerender = false;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The nightly sweep.
 *
 * Run by Vercel Cron (see vercel.json), which sends the project's CRON_SECRET
 * as a bearer token. Without that secret configured the route answers 404 — the
 * same rule /stats follows, and for the same reason: an unset secret must never
 * be the same thing as an open door. This one can send mail, so it is the last
 * endpoint on the site that should be guessable.
 *
 * It does no deciding of its own. `planNudge` says who is due and what to say;
 * this reads the store, sends, and writes down what went out.
 */
function authorised(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export const POST: APIRoute = async ({ request }) => run(request);

// Vercel Cron issues a GET. POST is here so the run can be triggered by hand
// with the same secret when something needs checking.
export const GET: APIRoute = async ({ request }) => run(request);

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) {
    // 404 rather than 401: there is nothing here to authenticate against.
    return new Response("Not found", { status: 404 });
  }

  if (!remindersConfigured()) {
    return new Response(JSON.stringify({ error: "no store" }), { status: 503 });
  }

  const now = Date.now();
  // Nobody below the first rung can be due, so they are never read.
  const cutoff = now - LADDER[0] * DAY_MS;
  const candidates = await staleSubscribers(cutoff);

  let considered = 0;
  let pushed = 0;
  let mailed = 0;
  let skipped = 0;
  let dropped = 0;
  let failed = 0;

  for (const { id, record } of candidates) {
    considered += 1;
    const { language, region } = getLocaleInfo(record.locale);

    const nudge = planNudge(
      {
        lastSeen: record.lastSeen,
        lastSentAt: record.lastSentAt,
        sentSinceSeen: record.sentSinceSeen,
        streak: record.streak,
        language,
        region,
      },
      now
    );

    if (!nudge) {
      skipped += 1;
      continue;
    }

    // Push first where there is one: it arrives now, costs nothing, and does not
    // spend inbox goodwill. Email is the fallback, not a second copy.
    let sent = false;

    if (record.push && pushConfigured) {
      const result = await sendPush(record.push, {
        title: nudge.title,
        body: nudge.body,
        url: localePath(record.locale, "/practice"),
        tag: "convi-reminder",
      });

      if (result === "sent") {
        sent = true;
        pushed += 1;
      } else if (result === "gone") {
        // The browser is gone for good. Drop the endpoint and let email, if
        // there is one, carry this nudge instead of losing it.
        await dropPush(id);
        dropped += 1;
      }
    }

    if (!sent && record.email && emailConfigured()) {
      const mail = reminderEmail(nudge, record.locale, id);
      sent = await sendEmail({
        to: record.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        unsubscribeUrl: mail.unsubscribeUrl,
        tags: [
          { name: "kind", value: "reminder" },
          { name: "step", value: String(nudge.step) },
        ],
      });
      if (sent) mailed += 1;
    }

    if (sent) {
      await recordNudgeSent(id, now);
    } else {
      // Nothing went out, so nothing is written down: the ladder does not
      // advance on a failure, and tomorrow's run tries the same rung again.
      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({ considered, pushed, mailed, skipped, dropped, failed }),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
