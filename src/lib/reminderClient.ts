/**
 * The browser's half of reminders.
 *
 * Client-safe: no Redis, no content files. The server's half is ./reminders.
 *
 * One value is kept on the device — an id this browser generated — and it is
 * the whole of the relationship. It is what says "the person who asked to be
 * reminded is here" when they turn up, and it is what an unsubscribe link
 * carries instead of a login. Lose it (clear site data) and the reminders stop
 * being cancellable from this device, which is why every email carries the
 * link.
 */

const ID_KEY = "convi:reminder-id:v1";
/** Set once the opt-in card has been answered — accepted or refused. */
const ANSWERED_KEY = "convi:reminder-prompt:v1";
/** Local day of the last heartbeat, so a visit reports itself once. */
const BEAT_KEY = "convi:reminder-beat:v1";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode. Reminders simply cannot be set up from here.
  }
}

/** The id this browser already has, or null. */
export function reminderId(): string | null {
  return read(ID_KEY);
}

/**
 * An id for this browser, made on first use.
 *
 * `randomUUID` is 122 bits of randomness and the store treats the id as a
 * capability, so it has to be unguessable rather than merely unique — a counter
 * or a timestamp would let anyone unsubscribe a stranger.
 */
export function ensureReminderId(): string | null {
  const existing = reminderId();
  if (existing) return existing;
  try {
    const id = window.crypto.randomUUID();
    write(ID_KEY, id);
    return read(ID_KEY);
  } catch {
    return null;
  }
}

export function forgetReminderId(): void {
  try {
    window.localStorage.removeItem(ID_KEY);
  } catch {
    // Nothing to do.
  }
}

export function reminderPromptAnswered(): boolean {
  try {
    return !!window.localStorage.getItem(ANSWERED_KEY);
  } catch {
    // No storage: never ask. A prompt that cannot remember being refused is a
    // prompt that asks again every round.
    return true;
  }
}

export function markReminderPrompt(answer: "push" | "email" | "dismissed"): void {
  write(ANSWERED_KEY, answer);
}

function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * "They are here."
 *
 * This is the whole of how the site can tell somebody has stopped using it, and
 * the answer is: only for people who opted in, and only per browser. It fires
 * from the layout, so any page counts — not finishing a round is not the same
 * as not turning up — at most once per local day, and it carries the reminder
 * id and nothing else. It is deliberately not folded into the anonymous view
 * beacon, which carries nothing and must stay that way: joining a subscriber id
 * to the site counters would turn them into per-person analytics.
 *
 * Best-effort and silent. It is also a no-op for everybody who has not opted
 * in, which is almost everybody.
 */
export function reminderHeartbeat(options: { locale?: string; streak?: number } = {}): void {
  if (typeof window === "undefined") return;
  const id = reminderId();
  if (!id) return;

  const today = localDay();
  if (read(BEAT_KEY) === today) return;
  // Written before the request, not after: a reminder heartbeat retried on
  // every page of a browsing session is worse than one missed by a dropped
  // connection, which tomorrow's visit corrects anyway.
  write(BEAT_KEY, today);

  void fetch("/api/reminders/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, locale: options.locale, streak: options.streak }),
    keepalive: true,
  }).catch(() => {});
}

/** What the server will say about whether reminders can be offered at all. */
export interface ReminderConfig {
  /** False when Redis is unset: nothing can be stored, so nothing is offered. */
  available: boolean;
  /** False when there is no VAPID key pair. Email can still be offered. */
  push: boolean;
  vapidPublicKey: string | null;
}

export async function fetchReminderConfig(): Promise<ReminderConfig> {
  try {
    const res = await fetch("/api/reminders/config");
    if (!res.ok) throw new Error("no config");
    return (await res.json()) as ReminderConfig;
  } catch {
    return { available: false, push: false, vapidPublicKey: null };
  }
}

/** Whether this browser can do web push at all. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * The VAPID public key arrives base64url; the Push API wants bytes.
 *
 * Backed by an ArrayBuffer built here rather than by `new Uint8Array(length)`:
 * the latter types as `Uint8Array<ArrayBufferLike>`, which could be a
 * SharedArrayBuffer, and `applicationServerKey` will not take one.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushOutcome = "subscribed" | "denied" | "unsupported" | "failed";

/**
 * Asks for permission and subscribes.
 *
 * The permission prompt is only ever raised from a click — a browser shows it
 * once per origin and spends the goodwill whether or not anybody was expecting
 * it, so it is asked for behind a button that says what it is for.
 */
export async function enablePush(
  vapidPublicKey: string,
  context: { locale?: string; streak?: number }
): Promise<PushOutcome> {
  if (!pushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.register("/sw.js");
    // A registration that is still installing has no pushManager to talk to.
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        // Non-negotiable in Chrome: a subscription that could be used to send a
        // silent push is refused outright.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const id = ensureReminderId();
    if (!id) return "failed";

    const res = await fetch("/api/reminders/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        push: subscription.toJSON(),
        locale: context.locale,
        streak: context.streak,
      }),
    });

    return res.ok ? "subscribed" : "failed";
  } catch {
    return "failed";
  }
}

/** Registers an email address for the same reminders. */
export async function enableEmailReminders(
  email: string,
  context: { locale?: string; streak?: number }
): Promise<boolean> {
  const id = ensureReminderId();
  if (!id) return false;

  try {
    const res = await fetch("/api/reminders/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, email, locale: context.locale, streak: context.streak }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
