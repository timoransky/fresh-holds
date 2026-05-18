import type { GymWithResets } from "@/lib/types";
import { daysSince } from "@/lib/date";

export const WEEKLY_VISIT_DAYS = 7;

// Freshness is a single signal: how many reset events happened at this gym
// since the user's last visit. Section attribution and boulder counts are
// per-row metadata for display; they don't feed the score. This keeps the
// system robust to whatever the gym chooses to share on a given day.
export type FreshnessResult = {
  freshResetCount: number;
  noveltyScore: number;
  daysSinceVisit: number | null;
  mostRecentFreshISO: string | null;
  mostRecentResetISO: string | null;
  hasResetData: boolean;
};

export function gymFreshness(
  gym: GymWithResets,
  lastVisitedISO: string | null,
): FreshnessResult {
  const resets = gym.resets;
  const hasResetData = resets.length > 0;
  const daysSinceVisit = lastVisitedISO === null ? null : Math.max(0, daysSince(lastVisitedISO));

  if (!hasResetData) {
    return {
      freshResetCount: 0,
      noveltyScore: 0,
      daysSinceVisit,
      mostRecentFreshISO: null,
      mostRecentResetISO: null,
      hasResetData: false,
    };
  }

  const visitedTime = lastVisitedISO === null ? -Infinity : Date.parse(lastVisitedISO);

  let freshResetCount = 0;
  let mostRecentFreshISO: string | null = null;
  let mostRecentResetISO: string | null = null;

  for (const reset of resets) {
    if (mostRecentResetISO === null || reset.reset_on > mostRecentResetISO) {
      mostRecentResetISO = reset.reset_on;
    }
    if (Date.parse(reset.reset_on) > visitedTime) {
      freshResetCount += 1;
      if (mostRecentFreshISO === null || reset.reset_on > mostRecentFreshISO) {
        mostRecentFreshISO = reset.reset_on;
      }
    }
  }

  const visitFactor = daysSinceVisit === null ? 1 : Math.min(daysSinceVisit / WEEKLY_VISIT_DAYS, 1);
  const noveltyScore = freshResetCount * visitFactor;

  return {
    freshResetCount,
    noveltyScore,
    daysSinceVisit,
    mostRecentFreshISO,
    mostRecentResetISO,
    hasResetData: true,
  };
}
