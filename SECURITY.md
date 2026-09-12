# Security

## Reporting

Found something? Email **hello@tryconvi.com** rather than opening an issue.

## What this project holds

Almost nothing, on purpose.

- **No accounts and no passwords.** There is nothing to log into.
- **No payment details.** Payments, when enabled, are handled entirely by
  Gumroad; no card ever touches this code.
- **No IP addresses.** They are hashed with a secret salt on arrival and only
  the hash is stored, under a key that expires after 30 days without a visit.
- **No location beyond a country code**, read from the edge.
- **Learner progress never leaves the device.** It is `localStorage` only.

## Secrets

Every environment variable is listed, with no values, in
[`.env.example`](.env.example). None has ever been committed: `.env*` has been
gitignored since the first commit, and build output — which can inline
variables — has never been tracked.

If you find a credential in the history, treat it as live and report it.

## Notes for anyone reading the code

- `/api/stats` answers `204` to everything, including malformed input. It is a
  fire-and-forget beacon; the response tells a caller nothing.
- `/stats` is a `404` without the right token, including when no token is
  configured. An unset secret must never be the same as an open door.
- The Gumroad webhook requires both a shared secret in the URL and a matching
  seller id, and refuses when either is unconfigured.
- Rate limiting fails **open** when Redis is unreachable; access checks fail
  **closed**. Counting is not worth an outage; entitlement is.
