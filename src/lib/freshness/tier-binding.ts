import { HOT, FRESH, WORTH, SLIM, STALE, UNKNOWN, type Tier } from "@/lib/tier";
import type { FreshnessResult } from "@/lib/freshness/scoring";

// The same noveltyScore (a recency-weighted reset-volume sum, see ADR-0004) is
// read through two different cut sets, because anon and returning users ask
// different questions about it:
//
// - Anon — "is this gym fresh right now?" The cuts are spaced to map a typical
//   weekly gym's score onto reset recency. At HALF_LIFE_DAYS = 10 such a gym
//   scores ~2.37 reset today, ~2.08 a day ago, ~1.94 at 2 days, ~1.58 at 5 days,
//   ~1.37 at a week. So HOT ≈ reset today/yesterday, FRESH ≈ 2–3 days, WORTH ≈
//   4–~11 days, SLIM beyond — and as a gym ages with no new reset it cools down
//   the ladder. Volume still modulates: a denser gym scores higher (can stay HOT
//   a touch longer), a sparse one lower. That spread is the "wow".
// - Returning — "is there enough new-to-me to bother?" One unseen reset (≤ 1.0)
//   is SLIM ("not a special trip"), two recent (~1.5) cross to WORTH, three
//   (~1.9) to FRESH, four-plus (~2.1+) to HOT ("most of the gym is new to you").
//   Zero unseen scores 0 → STALE on its own. The cuts are reachable by steady
//   weekly turnover over a typical visit gap, not just a rare burst: a month
//   away from a weekly gym (4–5 unseen resets) lands on HOT, which is what
//   "practically a new gym" should feel like.
//
// All six are calibration knobs (HALF_LIFE_DAYS = 10, ~weekly cadence). The anon
// cuts are the lever for first-open variance; tune them first if HOT goes
// always-empty or always-full on the anon page (the gym cards expose
// data-novelty-score / data-tier to read the live numbers).
export const ANON_HOT_SCORE = 2.0;
export const ANON_FRESH_SCORE = 1.75;
export const ANON_WORTH_SCORE = 0.9;

export const RETURNING_HOT_SCORE = 2.0;
export const RETURNING_FRESH_SCORE = 1.7;
export const RETURNING_WORTH_SCORE = 1.2;

export function bindTier(result: FreshnessResult, isAnon: boolean): Tier {
  if (!result.hasResetData) return UNKNOWN;

  const [hot, fresh, worth] = isAnon
    ? [ANON_HOT_SCORE, ANON_FRESH_SCORE, ANON_WORTH_SCORE]
    : [RETURNING_HOT_SCORE, RETURNING_FRESH_SCORE, RETURNING_WORTH_SCORE];

  const score = result.noveltyScore;
  if (score >= hot) return HOT;
  if (score >= fresh) return FRESH;
  if (score >= worth) return WORTH;
  if (score > 0) return SLIM;
  return STALE;
}
