/**
 * Sending a web push notification.
 *
 * SERVER ONLY. `web-push` does the two hard parts: signing the VAPID JWT that
 * proves the notification came from this site, and encrypting the payload to
 * the browser's own keys so the push service relaying it cannot read it.
 *
 * Optional like the rest: without a VAPID key pair, `pushConfigured` is false,
 * the opt-in card never offers push, and /api/reminders/config says so. A
 * half-configured push setup must never look available and then silently do
 * nothing.
 */
import webpush from "web-push";
import type { PushEndpoint } from "./reminders";

const publicKey = import.meta.env.VAPID_PUBLIC_KEY;
const privateKey = import.meta.env.VAPID_PRIVATE_KEY;
/**
 * The contact address a push service can complain to. The spec wants a mailto:
 * or https: URL, and Firefox rejects a subscription signed without one.
 */
const subject = import.meta.env.VAPID_SUBJECT || "mailto:hello@tryconvi.com";

export const pushConfigured = !!publicKey && !!privateKey;

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Handed to the browser so it can subscribe. Public by design. */
export function vapidPublicKey(): string | null {
  return pushConfigured ? publicKey : null;
}

/** What the service worker receives and renders. */
export interface PushPayload {
  title: string;
  body: string;
  /** Opened on tap. Same-origin path. */
  url: string;
  /**
   * Collapse key. Two reminders should replace each other rather than stack up
   * on a lock screen, so every nudge shares one tag.
   */
  tag: string;
}

export type PushResult = "sent" | "gone" | "failed" | "unconfigured";

/**
 * One notification.
 *
 * `gone` is the one result worth acting on: 404 and 410 are the push service
 * saying this endpoint will never work again — the browser was uninstalled, or
 * site data was cleared — and the record should drop it rather than retry every
 * night forever.
 */
export async function sendPush(
  endpoint: PushEndpoint,
  payload: PushPayload
): Promise<PushResult> {
  if (!pushConfigured) return "unconfigured";

  try {
    await webpush.sendNotification(
      { endpoint: endpoint.endpoint, keys: endpoint.keys },
      JSON.stringify(payload),
      // Push services drop anything they have not managed to deliver inside
      // the TTL. A reminder is worth a day and worthless after it.
      { TTL: 24 * 60 * 60, urgency: "normal" }
    );
    return "sent";
  } catch (error: unknown) {
    const status = (error as { statusCode?: number } | null)?.statusCode;
    if (status === 404 || status === 410) return "gone";
    return "failed";
  }
}
