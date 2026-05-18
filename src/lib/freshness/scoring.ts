import type { GymWithSections } from "@/lib/types";
import { daysSince } from "@/lib/date";

export const WEEKLY_VISIT_DAYS = 7;

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
      hasResetData: false,
      label: null,
    };
  }

  const visitedTime = lastVisitedISO === null ? -Infinity : Date.parse(lastVisitedISO);

  let freshResetCount = 0;
  let mostRecentFreshISO: string | null = null;
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
        sectionHasFresh = true;
      }
    }
    if (sectionHasFresh) freshSectionIds.push(section.id);
  }

  const visitFactor = daysSinceVisit === null ? 1 : Math.min(daysSinceVisit / WEEKLY_VISIT_DAYS, 1);
  const noveltyScore = freshResetCount * visitFactor;

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
    hasResetData: true,
    label,
  };
}
