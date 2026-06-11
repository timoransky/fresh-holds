import { HOT, FRESH, WORTH, SLIM, STALE, UNKNOWN, type Tier } from "@/lib/tier";
import type { FreshnessResult } from "@/lib/freshness/scoring";

const HOT_SCORE = 1.8;
const FRESH_SCORE = 0.85;
const WORTH_SCORE = 0.5;
const JUST_VISITED_DAYS = 2;

export function bindTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) return UNKNOWN;
  if (result.daysSinceVisit !== null && result.daysSinceVisit <= JUST_VISITED_DAYS) {
    return STALE;
  }
  if (result.noveltyScore >= HOT_SCORE) return HOT;
  if (result.noveltyScore >= FRESH_SCORE) return FRESH;
  if (result.noveltyScore >= WORTH_SCORE) return WORTH;
  if (result.noveltyScore > 0) return SLIM;
  return STALE;
}
