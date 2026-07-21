import type { GymWithSections } from "@/lib/types";
import { DAY_MS, daysSince } from "@/lib/date";

// Scoring model (see ADR-0005, which revises the returning lens of ADR-0004).
// One primitive read through two lenses, each with its own per-reset weight:
//
//   noveltyScore = Σ over relevant resets of  weight(ageDays)
//   anon:      weight(age) =                    0.5 ^ (age / HALF_LIFE_DAYS)
//   returning: weight(age) = FLOOR + (1−FLOOR) × 0.5 ^ (age / HALF_LIFE_DAYS)
//
// Each relevant reset row contributes a recency-weighted unit of "new climbing".
// Summing captures BOTH asks at once — more resets ⇒ bigger sum (volume), older
// resets ⇒ smaller contribution (cooling) — with no separate decay term. Boulder
// counts are deliberately ignored (most gyms don't report them); they're carried
// in the label for display only.
//
// The lenses weight age differently, on purpose:
//   - Anon — "is this gym fresh right now?" — decays all the way to 0, so an old
//     reset barely counts. FLOOR = 0 reduces the formula to the plain half-life.
//   - Returning — "how much is new to ME since I came?" — is fundamentally a
//     COUNT question. A reset you haven't seen is still new to you even if it's
//     a few weeks old, so each unseen reset keeps a floor of RETURNING_WEIGHT_FLOOR
//     no matter how old. Count then outweighs age: many old-but-unseen resets can
//     outscore a couple of recent ones. Age still modulates (a reset today counts
//     more than one from last month), just never to zero.
// Both formulas hit exactly 1.0 at age 0.
//
// "Relevant" depends on the lens:
//   - Returning (a visit is logged): resets after your last visit — "new to me".
//   - Anon (no visit logged): resets within the last ANON_WINDOW_DAYS — there's no
//     personal anchor, so we ask "what's fresh right now". The window keeps the
//     display fields honest (a sector last touched months ago isn't "fresh") and
//     beyond it the half-life weight is negligible anyway.
//
// The score is an UNBOUNDED sum (not clamped to 0..1) — it's never shown as a
// number, only mapped to a tier (see tier-binding.ts), where the two lenses get
// different cuts because they're asking different questions about the same sum.
export const ANON_WINDOW_DAYS = 28;
export const HALF_LIFE_DAYS = 10;
// Returning-lens per-reset floor: an unseen reset never counts for less than this,
// however old, so count outweighs age (see ADR-0005). Anon uses floor 0.
export const RETURNING_WEIGHT_FLOOR = 0.25;

export type FreshLabel = {
  freshSections: number;
  totalSections: number;
  countedBoulders: number;
  hasUncountedResets: boolean;
};

export type FreshnessResult = {
  freshSectionIds: string[];
  freshResetCount: number;
  noveltyScore: number;
  daysSinceVisit: number | null;
  mostRecentFreshISO: string | null;
  oldestFreshISO: string | null;
  hasResetData: boolean;
  label: FreshLabel | null;
};

export function gymFreshness(gym: GymWithSections, lastVisitedISO: string | null): FreshnessResult {
  const freshSectionIds: string[] = [];
  const sections = gym.sections;
  const hasResetData = sections.some((s) => s.resets.length > 0);
  const daysSinceVisit = lastVisitedISO === null ? null : Math.max(0, daysSince(lastVisitedISO));

  if (sections.length === 0 || !hasResetData) {
    return {
      freshSectionIds,
      freshResetCount: 0,
      noveltyScore: 0,
      daysSinceVisit,
      mostRecentFreshISO: null,
      oldestFreshISO: null,
      hasResetData: false,
      label: null,
    };
  }

  // Anon users have no logged visit, so only resets within ANON_WINDOW_DAYS are
  // "new" to them; returning users count everything after their visit.
  const cutoffTime =
    lastVisitedISO === null
      ? Date.now() - ANON_WINDOW_DAYS * DAY_MS
      : Date.parse(lastVisitedISO);

  // Anon decays to 0; returning floors each unseen reset so count outweighs age.
  const weightFloor = lastVisitedISO === null ? 0 : RETURNING_WEIGHT_FLOOR;

  let freshResetCount = 0;
  let noveltyScore = 0;
  let mostRecentFreshISO: string | null = null;
  let oldestFreshISO: string | null = null;
  let countedBoulders = 0;
  let hasUncountedResets = false;

  for (const section of sections) {
    let sectionHasFresh = false;
    for (const reset of section.resets) {
      if (Date.parse(reset.reset_on) > cutoffTime) {
        freshResetCount += 1;
        noveltyScore += recencyWeight(reset.reset_on, weightFloor);
        if (reset.boulders_reset !== null) {
          countedBoulders += reset.boulders_reset;
        } else {
          hasUncountedResets = true;
        }
        if (mostRecentFreshISO === null || reset.reset_on > mostRecentFreshISO) {
          mostRecentFreshISO = reset.reset_on;
        }
        if (oldestFreshISO === null || reset.reset_on < oldestFreshISO) {
          oldestFreshISO = reset.reset_on;
        }
        sectionHasFresh = true;
      }
    }
    if (sectionHasFresh) freshSectionIds.push(section.id);
  }

  const label: FreshLabel = {
    freshSections: freshSectionIds.length,
    totalSections: sections.length,
    countedBoulders,
    hasUncountedResets,
  };

  return {
    freshSectionIds,
    freshResetCount,
    noveltyScore,
    daysSinceVisit,
    mostRecentFreshISO,
    oldestFreshISO,
    hasResetData: true,
    label,
  };
}

// A single reset's contribution to the sum: 1.0 today (any floor), decaying by
// half every HALF_LIFE_DAYS toward `floor` (0 for anon, RETURNING_WEIGHT_FLOOR
// for returning). Clamped at age 0 so a reset dated today never exceeds 1.0.
function recencyWeight(resetISO: string, floor: number): number {
  const days = Math.max(0, daysSince(resetISO));
  return floor + (1 - floor) * Math.pow(0.5, days / HALF_LIFE_DAYS);
}
