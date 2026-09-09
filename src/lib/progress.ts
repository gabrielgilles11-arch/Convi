export interface Progress {
  reviewedItemIds: string[];
  knownItemIds: string[];
  unknownItemIds: string[];
  visitedCategoryIds: string[];
  streak: number;
  bestScores: Record<string, number>; // categoryId -> best % score (0-100)
  /** Local calendar day (YYYY-MM-DD) of the last completed round. */
  lastRoundDay: string | null;
  /** Consecutive days with at least one completed round. */
  dayStreak: number;
  /** Rounds finished on `lastRoundDay`, for the daily goal. */
  roundsToday: number;
  /** Rounds finished ever, which is what "has this person used it" means. */
  roundsCompleted: number;
  /** Items answered wrong and not yet answered right since — the mistake queue. */
  missedItemIds: string[];
}

/** Rounds per day that count as hitting the daily goal. */
export const DAILY_GOAL = 3;

const STORAGE_KEY = "convi:progress:v1";

function defaultProgress(): Progress {
  return {
    reviewedItemIds: [],
    knownItemIds: [],
    unknownItemIds: [],
    visitedCategoryIds: [],
    streak: 0,
    bestScores: {},
    lastRoundDay: null,
    dayStreak: 0,
    roundsToday: 0,
    roundsCompleted: 0,
    missedItemIds: [],
  };
}

/** Local calendar day, not UTC — a streak should follow the user's midnight. */
function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86400000);
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(progress: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markItemReviewed(itemId: string): Progress {
  const progress = loadProgress();
  if (!progress.reviewedItemIds.includes(itemId)) {
    progress.reviewedItemIds.push(itemId);
  }
  saveProgress(progress);
  return progress;
}

function without(list: string[], itemId: string): string[] {
  return list.filter((id) => id !== itemId);
}

export function markItemKnown(itemId: string): Progress {
  const progress = loadProgress();
  progress.unknownItemIds = without(progress.unknownItemIds, itemId);
  if (!progress.knownItemIds.includes(itemId)) progress.knownItemIds.push(itemId);
  saveProgress(progress);
  return progress;
}

export function markItemUnknown(itemId: string): Progress {
  const progress = loadProgress();
  progress.knownItemIds = without(progress.knownItemIds, itemId);
  if (!progress.unknownItemIds.includes(itemId)) progress.unknownItemIds.push(itemId);
  saveProgress(progress);
  return progress;
}

export function recordAnswer(correct: boolean): Progress {
  const progress = loadProgress();
  progress.streak = correct ? progress.streak + 1 : 0;
  saveProgress(progress);
  return progress;
}

export function recordCategoryScore(categoryId: string, scorePercent: number): Progress {
  const progress = loadProgress();
  const current = progress.bestScores[categoryId] ?? 0;
  if (scorePercent > current) {
    progress.bestScores[categoryId] = scorePercent;
  }
  saveProgress(progress);
  return progress;
}

/**
 * Called once when a round finishes — never per answer. Scoring per answer meant
 * the first correct answer recorded 1/1 = 100%, which cleared the category
 * outright and made the progress panel meaningless.
 */
export function recordRoundComplete(categoryId: string | null, scorePercent: number): Progress {
  const progress = loadProgress();
  const today = dayKey();

  // Counted before the day bookkeeping, because this one never resets: it is
  // the lifetime total, and the only question it answers is whether somebody
  // has actually used the thing yet.
  progress.roundsCompleted = (progress.roundsCompleted ?? 0) + 1;

  if (progress.lastRoundDay === today) {
    progress.roundsToday += 1;
  } else {
    const gap = progress.lastRoundDay ? daysBetween(progress.lastRoundDay, today) : null;
    // Consecutive day continues the streak; any longer gap restarts it at 1.
    progress.dayStreak = gap === 1 ? progress.dayStreak + 1 : 1;
    progress.lastRoundDay = today;
    progress.roundsToday = 1;
  }

  if (categoryId) {
    const current = progress.bestScores[categoryId] ?? 0;
    if (scorePercent > current) progress.bestScores[categoryId] = scorePercent;
  }

  saveProgress(progress);
  return progress;
}

/**
 * Rounds finished ever. Missing on progress saved before the counter existed,
 * which reads as zero — those people simply get the prompt a few rounds later
 * than they otherwise would have.
 */
export function roundsCompleted(progress: Progress = loadProgress()): number {
  return progress.roundsCompleted ?? 0;
}

/** Day streak, corrected for days elapsed since the last round. */
export function currentDayStreak(progress: Progress = loadProgress()): number {
  if (!progress.lastRoundDay) return 0;
  const gap = daysBetween(progress.lastRoundDay, dayKey());
  // Today or yesterday keeps it alive; yesterday is still "unbroken" until
  // midnight passes again, so only a gap of 2+ days zeroes it out.
  return gap <= 1 ? progress.dayStreak : 0;
}

/**
 * Mistake queue. An item enters when answered wrong and leaves when answered
 * right, so the queue is always "things I currently get wrong" rather than a
 * permanent record of every slip.
 */
export function recordQuestionResult(itemId: string, correct: boolean): Progress {
  const progress = loadProgress();
  if (correct) {
    progress.missedItemIds = progress.missedItemIds.filter((id) => id !== itemId);
  } else if (!progress.missedItemIds.includes(itemId)) {
    progress.missedItemIds.push(itemId);
  }
  saveProgress(progress);
  return progress;
}

export function missedItemIds(progress: Progress = loadProgress()): string[] {
  return progress.missedItemIds;
}

export function roundsCompletedToday(progress: Progress = loadProgress()): number {
  return progress.lastRoundDay === dayKey() ? progress.roundsToday : 0;
}
