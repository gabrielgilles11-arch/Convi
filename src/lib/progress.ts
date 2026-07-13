export interface Progress {
  reviewedItemIds: string[];
  streak: number;
  bestScores: Record<string, number>; // categoryId -> best % score (0-100)
}

const STORAGE_KEY = "convi:progress:v1";

function defaultProgress(): Progress {
  return { reviewedItemIds: [], streak: 0, bestScores: {} };
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
