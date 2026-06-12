import { HOT, FRESH, WORTH, SLIM, STALE, UNKNOWN, type Tier } from "@/lib/tier";
import type { FreshnessResult } from "@/lib/freshness/scoring";

// Fixed cuts of the 0..1 noveltyScore (see ADR-0003). Tuned so a week of reset
// recency spans the ladder for a saturated (anon / long-gap) gym: reset 0-1
// days → HOT, 2-3 → FRESH, 4-7 → WORTH, older → SLIM. No "just visited"
// override is needed: visiting with nothing new since leaves zero unseen
// resets, which scores 0 → STALE on its own.
const HOT_SCORE = 0.85;
const FRESH_SCORE = 0.7;
const WORTH_SCORE = 0.5;

export function bindTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) return UNKNOWN;
  if (result.noveltyScore >= HOT_SCORE) return HOT;
  if (result.noveltyScore >= FRESH_SCORE) return FRESH;
  if (result.noveltyScore >= WORTH_SCORE) return WORTH;
  if (result.noveltyScore > 0) return SLIM;
  return STALE;
}
