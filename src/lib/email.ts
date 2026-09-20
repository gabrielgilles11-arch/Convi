/**
 * Sending mail, in one place.
 *
 * Two senders used to exist and only one of them was real: /api/signup posted
 * to Resend inline, from `onboarding@resend.dev`, to tell the owner an address
 * had arrived. Nothing else was ever sent — not to the person who typed it, not
 * later. This is the layer both the signup route and the reminder cron use.
 *
 * Optional, like every other integration here: with no API key, `sendEmail`
 * reports a failure and the caller carries on. A learner must never see a form
 * fail because a mail provider is down, and the signup is stored before
 * anything is sent, so nothing is lost when it is.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a reply goes. On a signup notification, the person who signed up. */
  replyTo?: string;
  /** One-click unsubscribe target, for anything a person can opt out of. */
  unsubscribeUrl?: string;
  /**
   * Ask the client to file it as important. Gmail has no API for "top of the
   * inbox" and these headers are a request rather than an instruction — what
   * actually decides it is a verified sending domain plus a filter. See
   * `EMAIL_FROM` in .env.example.
   */
  priority?: boolean;
  /** Resend tags, for finding a send again in their dashboard. */
  tags?: { name: string; value: string }[];
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * The From address.
 *
 * `onboarding@resend.dev` is Resend's shared sandbox sender: it works without
 * any DNS setup, and it is also why the old notifications landed in Promotions
 * or Spam rather than the inbox — nothing about it authenticates as this site.
 * Set EMAIL_FROM to an address on a domain verified in Resend and that stops
 * being true.
 */
function fromAddress(): string {
  const configured = import.meta.env.EMAIL_FROM;
  return typeof configured === "string" && configured.trim()
    ? configured.trim()
    : "Try Convi <onboarding@resend.dev>";
}

export function emailConfigured(): boolean {
  return !!import.meta.env.ResendAPI;
}

/** The owner's address — where signup notifications go. */
export function ownerEmail(): string | null {
  const value = import.meta.env.Email;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** True when the send went out. Never throws: callers treat false as "later". */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = import.meta.env.ResendAPI;
  if (!apiKey) return false;

  const headers: Record<string, string> = {};

  if (message.priority) {
    // The three headers mail clients actually look at. Gmail treats them as one
    // signal among many, which is the honest description of what they do.
    headers["X-Priority"] = "1";
    headers["Importance"] = "high";
    headers["X-MSMail-Priority"] = "High";
  }

  if (message.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    // One-click, so the inbox's own unsubscribe button works without the
    // recipient ever landing on a page. Requires the endpoint to accept POST.
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.tags ? { tags: message.tags } : {}),
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    });
    return res.ok;
  } catch {
    // Network, DNS, or Resend being down. The caller has already stored
    // whatever mattered.
    return false;
  }
}

/** Escapes text going into an HTML template. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The one email shell.
 *
 * Table-based and inline-styled, because that is what mail clients render:
 * Outlook has no flexbox and Gmail strips a <style> block's media queries. The
 * preheader is the hidden first line an inbox shows beside the subject; left
 * out, clients quote the first thing they find, which is usually a link.
 */
export function emailShell(options: {
  preheader: string;
  heading: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}): string {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#5f4c3e;">${line}</p>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(options.heading)}</title></head>
<body style="margin:0;padding:0;background:#fff6ec;">
<div style="display:none;font-size:1px;color:#fff6ec;max-height:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ec;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #f0dcc8;border-radius:16px;padding:28px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td>
<p style="margin:0 0 18px;font-size:14px;font-weight:800;letter-spacing:0.04em;color:#e8622c;">¡TRY CONVI!</p>
<h1 style="margin:0 0 12px;font-size:23px;line-height:1.25;color:#241610;">${escapeHtml(options.heading)}</h1>
${paragraphs}
<p style="margin:22px 0 0;">
  <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#e8622c;color:#ffffff;text-decoration:none;font-weight:800;letter-spacing:0.04em;">${escapeHtml(options.ctaLabel)}</a>
</p>
<p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#8a7768;">${options.footer}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}
