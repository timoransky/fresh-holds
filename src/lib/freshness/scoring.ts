import type { GymWithSections, Reset } from "@/lib/types";
import { daysSince } from "@/lib/date";

export const WEEKLY_VISIT_DAYS = 7;

// A label carries every signal we have. Each field is independently nullable
// so the badge / narrative can pick the most specific one available:
//   - `sectors`: gym has named sectors. count = how many had a fresh reset.
//   - `boulders`: at least one fresh reset carried a boulder count. Sums
//                  per-section and gym-wide counted resets together.
// When both are null but resetCount > 0, we know something fresh dropped
// without knowing where or how many (e.g. "nové bouldre" Instagram post).
export type FreshLabel = {
  sectors: { count: number; total: number } | null;
  boulders: number | null;
};

export type FreshnessResult = {
  freshSectionIds: Set<string>;
  freshResetCount: number;
  noveltyScore: number;
  daysSinceVisit: number | null;
  mostRecentFreshISO: string | null;
  hasResetData: boolean;
  label: FreshLabel | null;
};

export function gymFreshness(gym: GymWithSections, lastVisitedISO: string | null): FreshnessResult {
  const freshSectionIds = new Set<string>();
  const sections = gym.sections;
  const gymWideResets = gym.gymWideResets;
  const hasResetData = sections.some((s) => s.resets.length > 0) || gymWideResets.length > 0;
  const daysSinceVisit = lastVisitedISO === null ? null : Math.max(0, daysSince(lastVisitedISO));

  if (!hasResetData) {
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
  let freshBoulderSum = 0;
  let anyCountedFresh = false;

  const consume = (reset: Reset, attachedSectionId: string | null) => {
    if (Date.parse(reset.reset_on) <= visitedTime) return;
    freshResetCount += 1;
    if (reset.boulders_reset !== null) {
      freshBoulderSum += reset.boulders_reset;
      anyCountedFresh = true;
    }
    if (mostRecentFreshISO === null || reset.reset_on > mostRecentFreshISO) {
      mostRecentFreshISO = reset.reset_on;
    }
    if (attachedSectionId !== null) {
      freshSectionIds.add(attachedSectionId);
    }
  };

  for (const section of sections) {
    for (const reset of section.resets) {
      consume(reset, section.id);
    }
  }
  for (const reset of gymWideResets) {
    consume(reset, null);
  }

  const visitFactor = daysSinceVisit === null ? 1 : Math.min(daysSinceVisit / WEEKLY_VISIT_DAYS, 1);
  const noveltyScore = freshResetCount * visitFactor;

  const label: FreshLabel = {
    sectors: sections.length > 0 ? { count: freshSectionIds.size, total: sections.length } : null,
    boulders: anyCountedFresh ? freshBoulderSum : null,
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
