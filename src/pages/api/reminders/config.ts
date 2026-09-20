import type { APIRoute } from "astro";
import { remindersConfigured } from "../../../lib/reminders";
import { pushConfigured, vapidPublicKey } from "../../../lib/webpush";

export const prerender = false;

/**
 * What the opt-in card is allowed to offer.
 *
 * Read at runtime rather than baked into the page, because the practice pages
 * are prerendered: a key inlined at build time could not be rotated without a
 * deploy, and a deploy is not what rotating a key should need.
 *
 * `available: false` is the honest answer when nothing can be stored. The card
 * then says reminders are not available instead of taking an address it would
 * have to throw away.
 */
export const GET: APIRoute = async () =>
  new Response(
    JSON.stringify({
      available: remindersConfigured(),
      push: remindersConfigured() && pushConfigured,
      // Public by design: it is the key a browser signs its subscription
      // against, and the private half never leaves the server.
      vapidPublicKey: vapidPublicKey(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Small, and it changes when the environment does.
        "Cache-Control": "public, max-age=300",
      },
    }
  );
