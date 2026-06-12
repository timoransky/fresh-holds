import { HOT, FRESH, WORTH, SLIM, STALE, UNKNOWN, type Tier } from "@/lib/tier";
import type { FreshnessResult } from "@/lib/freshness/scoring";

// Fixed cuts of the 0..1 noveltyScore (see ADR-0003). Tuned so a week of reset
// recency spans the ladder for a typical anon weekly gym (4 resets in the
// window, turnover 0.8): reset 0-1 days → HOT, 2-3 → FRESH, 4-7 → WORTH,
// older → SLIM. For returning users HOT needs roughly 4+ unseen resets with a
// day-old drop. No "just visited" override is needed: visiting with nothing
// new since leaves zero unseen resets, which scores 0 → STALE on its own.
const HOT_SCORE = 0.72;
const FRESH_SCORE = 0.58;
const WORTH_SCORE = 0.38;

export function bindTier(result: FreshnessResult): Tier {
  if (!result.hasResetData) return UNKNOWN;
  if (result.noveltyScore >= HOT_SCORE) return HOT;
  if (result.noveltyScore >= FRESH_SCORE) return FRESH;
  if (result.noveltyScore >= WORTH_SCORE) return WORTH;
  if (result.noveltyScore > 0) return SLIM;
  return STALE;
}
