/**
 * Cross-run de-duplication. A feed re-lists the same story for days; without
 * memory, the digest would too. State is a flat JSON file committed back to
 * the repo by the workflow — no database for something this small.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const STATE_PATH = path.join(import.meta.dirname, "state", "seen.json");
const RETENTION_DAYS = 14;

export function hashItem(item) {
  const normalized = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha256").update(`${item.sourceId}:${normalized}`).digest("hex").slice(0, 16);
}

export function loadSeen() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

/** Drops entries older than the retention window so the file doesn't grow forever. */
export function pruneAndSave(seen, newHashes, now = new Date()) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  const merged = { ...seen };
  for (const hash of newHashes) merged[hash] = now.toISOString();

  const kept = Object.fromEntries(Object.entries(merged).filter(([, seenAt]) => new Date(seenAt).getTime() >= cutoff));

  mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(kept, null, 2) + "\n");
  return kept;
}
