/**
 * Whether any part of the site is behind a purchase.
 *
 * Off. Practice mode and every scenario pack are free to everyone, because at
 * this stage a paywall costs users and earns nothing: there is no funnel to
 * protect, and the thing being gated — Practice — is the product itself.
 * Nobody comes back tomorrow for a phrasebook they can already read.
 *
 * Nothing was deleted to do this. The Gumroad product, the signed entitlement
 * cookie, the purchase check, the webhook and both gate components are all
 * still here and still correct; they simply are not consulted while this is
 * false. Flipping it back to true restores the paywall exactly as it was, with
 * the same categories paid and the same two-device limit.
 *
 * Deliberately its own module with no imports, so both the server (content,
 * API routes) and the browser bundle can read it without dragging anything
 * along behind it.
 */
export const PAYWALL_ENABLED = false;
