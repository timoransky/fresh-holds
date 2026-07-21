import { HOT, FRESH, WORTH, SLIM, STALE, UNKNOWN, type Tier } from "@/lib/tier";
import type { FreshnessResult } from "@/lib/freshness/scoring";

// The noveltyScore (a recency-weighted reset-volume sum, see ADR-0004/0005) is
// read through two different cut sets, because anon and returning users ask
// different questions about it — and the two lenses weight reset age differently
// (anon decays to 0, returning floors each reset at RETURNING_WEIGHT_FLOOR), so
// the cuts aren't comparable across lenses.
//
// - Anon — "is this gym fresh right now?" The cuts are spaced to map a typical
//   weekly gym's score onto reset recency. At HALF_LIFE_DAYS = 10 such a gym
//   scores ~2.37 reset today, ~2.08 a day ago, ~1.94 at 2 days, ~1.58 at 5 days,
//   ~1.37 at a week. So HOT ≈ reset today/yesterday, FRESH ≈ 2–3 days, WORTH ≈
//   4–~11 days, SLIM beyond — and as a gym ages with no new reset it cools down
//   the ladder. Volume still modulates: a denser gym scores higher (can stay HOT
//   a touch longer), a sparse one lower. That spread is the "wow".
// - Returning — "how much is new-to-me since I came?" Because the returning
//   weight floors each unseen reset at 0.25, this ladder is driven mostly by
//   COUNT (see ADR-0005): 1 fresh unseen reset (≤ 1.0) is WORTH, 2 recent (~1.7)
//   are FRESH, 3+ recent (~2.0+) are HOT ("most of the gym is new to you"). A
//   lone unseen reset cools WORTH → SLIM at ~2 weeks (fw(14) ≈ 0.53). Many
//   old-but-unseen resets sit about one tier below the same count when fresh (a
//   mild staleness pull), never falling to STALE while unseen resets remain. Zero
//   unseen scores 0 → STALE on its own.
//
// All six are calibration knobs (HALF_LIFE_DAYS = 10, ~weekly cadence). The anon
// cuts are the lever for first-open variance; tune them first if HOT goes
// always-empty or always-full on the anon page (the gym cards expose
// data-novelty-score / data-tier to read the live numbers).
export const ANON_HOT_SCORE = 2.0;
export const ANON_FRESH_SCORE = 1.75;
export const ANON_WORTH_SCORE = 0.9;

export const RETURNING_HOT_SCORE = 2.0;
export const RETURNING_FRESH_SCORE = 1.45;
export const RETURNING_WORTH_SCORE = 0.53;

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
