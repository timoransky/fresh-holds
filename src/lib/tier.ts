import type { FreshnessResult } from "@/lib/freshness";

export type TierKey = "hot" | "worth" | "slim" | "stale" | "unknown";

export type Tier = {
  key: TierKey;
  label: string;
  emoji: string;
  rotateDeg: number;
};

// Novelty-score bins. Score is `freshResetCount * min(daysSinceVisit / 7, 1)` — a gym
// you haven't been to in a week with 2+ fresh resets clears HOT_SCORE; one fresh
// reset on a week-overdue gym sits at WORTH_SCORE.
const HOT_SCORE = 2;
const WORTH_SCORE = 1;
// Hard floor: even if there are fresh resets, a gym you visited within the last
// JUST_VISITED_DAYS days isn't worth recommending — you were just there.
const JUST_VISITED_DAYS = 2;

const HOT: Tier = { key: "hot", label: "sending hot", emoji: "🔥", rotateDeg: -2 };
const WORTH: Tier = { key: "worth", label: "worth a climb", emoji: "⚡", rotateDeg: 1.5 };
const SLIM: Tier = { key: "slim", label: "slim pickings", emoji: "🌱", rotateDeg: -1 };
const STALE: Tier = { key: "stale", label: "all stale", emoji: "💤", rotateDeg: 2 };
const UNKNOWN: Tier = { key: "unknown", label: "no data yet", emoji: "❓", rotateDeg: -1.5 };

export function freshnessTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) return UNKNOWN;

  if (result.daysSinceVisit !== null && result.daysSinceVisit <= JUST_VISITED_DAYS) {
    return STALE;
  }

  if (result.noveltyScore >= HOT_SCORE) return HOT;
  if (result.noveltyScore >= WORTH_SCORE) return WORTH;
  if (result.noveltyScore > 0) return SLIM;
  return STALE;
}
