import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../lib/ratelimit";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  const apiKey = import.meta.env.ResendAPI;
  const notifyEmail = import.meta.env.Email;

  if (apiKey && notifyEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Convi <onboarding@resend.dev>",
          to: notifyEmail,
          subject: "New Convi signup",
          text: `New signup: ${email}`,
        }),
      });
    } catch {
      // Don't fail the signup if the notification email fails to send.
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
