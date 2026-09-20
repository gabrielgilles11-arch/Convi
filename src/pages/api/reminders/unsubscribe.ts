import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../../lib/ratelimit";
import { unsubscribe, validId } from "../../../lib/reminders";

export const prerender = false;

/**
 * The X, in link form.
 *
 * GET is the link in an email; POST is the inbox's own one-click unsubscribe
 * button, which is what the `List-Unsubscribe-Post` header promises will work.
 * Both do the same thing, because an unsubscribe that needs a second
 * confirmation is an unsubscribe that doesn't work.
 *
 * No login, and none possible: the id in the link *is* the authorisation, which
 * is what an account-less site can offer. It is 122 bits of randomness, so it
 * cannot be guessed, and the only thing it can be used for is this.
 */
async function stop(id: unknown): Promise<boolean> {
  if (!validId(id)) return false;
  return unsubscribe(id);
}

/** Shown in a browser after the link is followed. */
function page(done: boolean): string {
  const heading = done ? "That's it, no more reminders." : "Nothing to unsubscribe.";
  const line = done
    ? "You won't get another push or email from us. Your practice progress is untouched, since it never left your browser in the first place."
    : "That link has already been used, or the reminder it belonged to has expired. Either way, nothing is being sent.";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reminders off: Try Convi</title><meta name="robots" content="noindex">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#fff6ec;color:#241610;font:500 17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;padding:1.5rem;}
  main{max-width:34rem;background:#fff;border:1px solid #f0dcc8;border-radius:16px;padding:2rem;}
  h1{margin:0 0 .5rem;font-size:1.5rem;line-height:1.2;}
  p{margin:0 0 1.25rem;color:#5f4c3e;}
  a{display:inline-block;padding:.8rem 1.4rem;border-radius:999px;background:#e8622c;color:#fff;
    text-decoration:none;font-weight:800;letter-spacing:.04em;}
</style></head>
<body><main>
<h1>${heading}</h1>
<p>${line}</p>
<a href="/">Back to Try Convi</a>
</main></body></html>`;
}

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  if (!(await allowRequest(`rem-off:${clientIp(request, clientAddress)}`, 10))) {
    return new Response("Too many requests", { status: 429 });
  }

  const done = await stop(url.searchParams.get("id"));
  return new Response(page(done), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
};

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!(await allowRequest(`rem-off:${clientIp(request, clientAddress)}`, 10))) {
    return new Response(null, { status: 429 });
  }

  // One-click senders post the id in the query string, since the body is the
  // fixed `List-Unsubscribe=One-Click`. A JSON body is accepted too, for the
  // app's own use.
  let id: unknown = url.searchParams.get("id");
  if (!id) {
    try {
      id = ((await request.json()) as Record<string, unknown>)?.id;
    } catch {
      // Form-encoded or empty. The query string was the only chance.
    }
  }

  await stop(id);
  // 200 whatever happened: a mail client retrying because we said 404 for an id
  // that was already gone helps nobody.
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
};
