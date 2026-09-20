/**
 * The service worker, which exists for one reason: a push notification has to
 * be handled by something that runs when the tab is closed.
 *
 * Deliberately not a cache. Offline support would mean deciding which of a
 * three-edition content site to keep and when to consider it stale, and a
 * learner reading a phrase that was edited a month ago because a worker still
 * had it is a worse failure than a page that needs a connection. This file
 * shows notifications and opens the site. That is all.
 *
 * Served from /public, so it is at the origin root and its scope is the whole
 * site — a worker can only control pages at or below its own path.
 */

self.addEventListener("install", () => {
  // Nothing to pre-cache, so take over immediately rather than waiting for
  // every tab to close: the first reminder should not depend on that.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** Used when a payload is missing or unreadable — see below. */
const FALLBACK = {
  title: "¡Try Convi!",
  body: "One round is eight questions. Two minutes.",
  url: "/practice",
  tag: "convi-reminder",
};

self.addEventListener("push", (event) => {
  let payload = FALLBACK;

  // A push can legitimately arrive with no data, and a malformed one must not
  // take the handler down: Chrome shows its own generic "site updated in the
  // background" notification if a push event ends without one being displayed,
  // which is worse than our own fallback copy.
  try {
    if (event.data) payload = { ...FALLBACK, ...event.data.json() };
  } catch {
    payload = FALLBACK;
  }

  // Same-origin only. The url comes from our own sender, but it ends up in
  // openWindow, so it is resolved and checked rather than trusted.
  let url = FALLBACK.url;
  try {
    const resolved = new URL(payload.url ?? FALLBACK.url, self.location.origin);
    if (resolved.origin === self.location.origin) url = resolved.pathname + resolved.search;
  } catch {
    url = FALLBACK.url;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || FALLBACK.title, {
      body: payload.body || FALLBACK.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      // One tag for every reminder, so a second one replaces the first instead
      // of stacking two near-identical lines on a lock screen.
      tag: payload.tag || FALLBACK.tag,
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || FALLBACK.url;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // An already-open tab is focused and steered rather than joined by a
      // second one: somebody who taps a reminder wants the site, not two of it.
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) {
          try {
            await client.navigate(target);
          } catch {
            // Focus alone is enough; a cross-document navigate can be refused.
          }
        }
        return;
      }

      await self.clients.openWindow(target);
    })()
  );
});
