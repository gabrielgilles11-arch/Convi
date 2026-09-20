/**
 * The reminder email itself: subject, HTML, plain text, and the way out.
 *
 * Its own module rather than a helper inside the cron route, because it is the
 * part somebody actually receives. What a reminder says, and whether it can
 * always be stopped, are worth a test; how a route loops over subscribers is
 * not.
 */
import { emailShell, escapeHtml } from "./email";
import type { Nudge } from "./reminderPlan";
import { getLocaleInfo, localePath, type Locale } from "./content";

export const SITE = "https://tryconvi.com";

/** The one-click opt-out. In every reminder, without exception. */
export function unsubscribeUrl(id: string, site = SITE): string {
  return `${site}/api/reminders/unsubscribe?id=${encodeURIComponent(id)}`;
}

/** Where a reminder lands: the practice path, in the edition they were using. */
export function practiceUrl(locale: Locale, site = SITE): string {
  return `${site}${localePath(locale, "/practice")}`;
}

export interface ReminderEmail {
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

export function reminderEmail(
  nudge: Nudge,
  locale: Locale,
  id: string,
  site = SITE
): ReminderEmail {
  const { language } = getLocaleInfo(locale);
  const url = practiceUrl(locale, site);
  const off = unsubscribeUrl(id, site);

  const body = [
    escapeHtml(nudge.body),
    nudge.last
      ? "This is the last reminder we'll send — you don't need to do anything."
      : "Everything on Try Convi is free and there is no account, so this is the only thing we could possibly be emailing you about.",
  ];

  // The last nudge still carries the link, in the footer sentence below, even
  // though it promises to stop: "we'll stop" is a promise, and an opt-out that
  // depends on a promise being kept is not an opt-out.
  const footer = nudge.last
    ? `You asked for these while practising ${escapeHtml(language)}. That's us done — <a href="${escapeHtml(off)}" style="color:#8a7768;">or stop them yourself</a>.`
    : `You asked for these while practising ${escapeHtml(language)}. <a href="${escapeHtml(off)}" style="color:#8a7768;">Stop them</a> — one click, no questions.`;

  return {
    subject: nudge.subject,
    html: emailShell({
      preheader: nudge.preheader,
      heading: nudge.title,
      body,
      ctaLabel: nudge.cta,
      ctaUrl: url,
      footer,
    }),
    text: [
      nudge.title,
      "",
      nudge.body,
      "",
      `${nudge.cta}: ${url}`,
      "",
      nudge.last ? `This was the last one. Stop them anyway: ${off}` : `Stop these: ${off}`,
    ].join("\n"),
    unsubscribeUrl: off,
  };
}
