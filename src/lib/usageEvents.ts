/**
 * The vocabulary an anonymous usage event is written in.
 *
 * Dependency-free on purpose: both the browser and the server need these, and
 * the server's half (./stats) imports Redis. Keeping the shared words here is
 * what stops a client bundle from pulling a database client in behind them.
 */

/**
 * Lifetime-round counts worth knowing the funnel at. One is "tried it at all",
 * five is where the email prompt appears, and the rest are the shape of the
 * tail. Each is reported once per device, the first time it is crossed.
 */
export const MILESTONES = [1, 5, 10, 25, 50] as const;

export type Milestone = (typeof MILESTONES)[number];
