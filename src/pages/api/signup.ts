import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../lib/ratelimit";
import { kv } from "../../lib/kv";
import {
  emailConfigured,
  emailShell,
  escapeHtml,
  ownerEmail,
  sendEmail,
} from "../../lib/email";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Addresses, newest last, scored by when they arrived. */
const LIST_KEY = "convi:signups";

/**
 * Collecting an email, and then doing something with it.
 *
 * What this used to be: validate, post one notification to the owner from
 * Resend's shared sandbox sender, return success. Three things wrong with that,
 * all of them silent.
 *
 * The address was never stored. The notification *was* the record, so a Resend
 * outage, an unset key or a message going to spam meant the signup simply never
 * happened, and nobody would ever know which ones were lost. It is written down
 * first now, and the sending is best-effort on top.
 *
 * The person who typed it got nothing back. A form that says "Thanks!" and then
 * never appears in your inbox is indistinguishable from a form that threw the
 * address away, which is roughly what this one was doing.
 *
 * And the notification came from `onboarding@resend.dev`, which authenticates as
 * Resend rather than as this site — which is why it landed in Promotions or
 * Spam instead of the inbox. Set EMAIL_FROM to an address on a verified domain
 * and that stops being true; the priority headers, the Reply-To and the stable
 * subject below are what make it filterable once it gets there. See
 * .env.example for the Gmail filter that does the last mile, because no header
 * can promise the top of somebody's inbox.
 */
async function store(email: string): Promise<void> {
  if (!kv) return;
  try {
    // A sorted set, so a second signup from the same address updates its time
    // rather than adding a duplicate, and the newest are one range query away.
    await kv.zadd(LIST_KEY, { score: Date.now(), member: email });
  } catch {
    // Redis is down. The notification below is then the only record, which is
    // the situation this whole function exists to stop being the normal one —
    // but failing the signup would lose the address either way.
  }
}

function welcomeEmail(email: string): { html: string; text: string } {
  const html = emailShell({
    preheader: "You're on the list for the app and the printable phrasebook.",
    heading: "You're on the list.",
    body: [
      "We'll email you when the Try Convi app and the printable phrasebook are ready for your next trip. That's the only thing this list is for.",
      "In the meantime everything on the site is already free: every scenario in Spanish, Swedish and German, and the practice path that drills them.",
    ],
    ctaLabel: "Start practising",
    ctaUrl: "https://tryconvi.com/practice",
    footer: `You're getting this because you signed up at tryconvi.com with ${escapeHtml(
      email
    )}. Reply to this email and a person will read it.`,
  });

  const text = [
    "You're on the list.",
    "",
    "We'll email you when the Try Convi app and the printable phrasebook are ready.",
    "Everything on the site is already free: https://tryconvi.com/practice",
    "",
    `You signed up at tryconvi.com with ${email}.`,
  ].join("\n");

  return { html, text };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!(await allowRequest(`signup:${clientIp(request, clientAddress)}`))) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  const address = email.trim().toLowerCase();

  // Written down before anything is sent. A send is allowed to fail; losing the
  // address is not.
  await store(address);

  if (emailConfigured()) {
    const owner = ownerEmail();
    const welcome = welcomeEmail(address);

    // Both sends at once, and neither is allowed to fail the request: the
    // signup is already saved by this point.
    await Promise.allSettled([
      owner
        ? sendEmail({
            to: owner,
            // Stable and distinctive, so one Gmail filter catches every one of
            // them forever. The address is in the subject so the inbox list
            // alone is the record.
            subject: `Try Convi signup: ${address}`,
            html: emailShell({
              preheader: address,
              heading: "New Try Convi signup",
              body: [
                `<strong>${escapeHtml(address)}</strong>`,
                "Reply to this email to answer them directly.",
              ],
              ctaLabel: "Open Try Convi",
              ctaUrl: "https://tryconvi.com/",
              footer: "Sent by the signup form on tryconvi.com.",
            }),
            text: `New signup: ${address}`,
            // Replying answers the person who signed up, not the robot.
            replyTo: address,
            priority: true,
            tags: [{ name: "kind", value: "signup-notification" }],
          })
        : Promise.resolve(false),
      sendEmail({
        to: address,
        subject: "You're on the Try Convi list",
        html: welcome.html,
        text: welcome.text,
        tags: [{ name: "kind", value: "signup-welcome" }],
      }),
    ]);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
