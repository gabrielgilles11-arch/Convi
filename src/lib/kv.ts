import { Redis } from "@upstash/redis";

/**
 * The one Redis connection.
 *
 * Three call sites were each constructing their own client from the same two
 * variables, which is three copies of the "is it configured yet" question and
 * three answers that could drift. The store is optional everywhere it is used:
 * until the variables are set, `kv` is null and every caller is expected to
 * carry on without it rather than fail.
 */
const url = import.meta.env.KV_REST_API_URL;
const token = import.meta.env.KV_REST_API_TOKEN;

export const kv = url && token ? new Redis({ url, token }) : null;

/** Whether anything that needs the store can run at all. */
export const kvConfigured = kv !== null;
