import type { GymWithSections } from "@/lib/types";
import { daysSince } from "@/lib/date";

// Scoring model (see ADR-0003). noveltyScore = turnover × recency, both in 0..1.
//
//   turnover = unseenResets / (unseenResets + 1)
//     Each reset row (a named sector's drop, or "part of the gym" for unnamed
//     gyms) is one chunk of climbing that's new to you. Boulder counts are
//     deliberately ignored — most gyms don't report them. The longer you stay
//     away, the more chunks accumulate, so visit gap enters here for free.
//     The curve never caps: 1 → 0.50, 2 → 0.67, 3 → 0.75, 4 → 0.80, 5 → 0.83…
//     every extra unseen reset always adds, with diminishing returns, so a gym
//     with more piled-up resets always outscores one with fewer (recency equal).
//
//   recency = 0.5 ^ (daysSinceNewestUnseenReset / halfLife)
//     For anon users the newest drop's age is the whole signal, so freshness
//     halves every week (the reset cadence). For returning users the unseen
//     count is the dominant signal — everything after your visit is new to you
//     regardless of its age — so recency decays at half speed (2-week
//     half-life): one extra unseen reset outweighs a day of reset age, while a
//     gym that stopped resetting still sinks eventually.
//
// "Unseen" = reset after your last visit. Anonymous users (no visit logged) are
// treated as if they last visited ANON_VISIT_GAP_DAYS ago — i.e. the page ranks
// like a once-a-month climber sees it.
export const ANON_VISIT_GAP_DAYS = 28;
const RECENCY_HALF_LIFE_ANON_DAYS = 7;
const RECENCY_HALF_LIFE_RETURNING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Anon users have no logged visit, so anchor them to a once-a-month baseline:
  // only resets within the last ANON_VISIT_GAP_DAYS count as new to them.
  const visitedTime =
    lastVisitedISO === null
      ? Date.now() - ANON_VISIT_GAP_DAYS * DAY_MS
      : Date.parse(lastVisitedISO);

  let freshResetCount = 0;
  let mostRecentFreshISO: string | null = null;
  let oldestFreshISO: string | null = null;
  let countedBoulders = 0;
  let hasUncountedResets = false;

  for (const section of sections) {
    let sectionHasFresh = false;
    for (const reset of section.resets) {
      if (Date.parse(reset.reset_on) > visitedTime) {
        freshResetCount += 1;
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

  const turnover = freshResetCount / (freshResetCount + 1);
  const recency = computeRecency(mostRecentFreshISO, lastVisitedISO !== null);
  const noveltyScore = turnover * recency;

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

function computeRecency(mostRecentFreshISO: string | null, isReturning: boolean): number {
  if (mostRecentFreshISO === null) return 0;
  const halfLife = isReturning ? RECENCY_HALF_LIFE_RETURNING_DAYS : RECENCY_HALF_LIFE_ANON_DAYS;
  const days = Math.max(0, daysSince(mostRecentFreshISO));
  return Math.pow(0.5, days / halfLife);
}
