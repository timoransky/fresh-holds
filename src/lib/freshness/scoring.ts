import type { GymWithSections } from "@/lib/types";
import { daysSince } from "@/lib/date";

// Visit-gap ramp: visitFactor scales from 0 at a fresh visit to MAX_VISIT_FACTOR
// once the user has been away long enough. 14 days = full weight (1.0), and a
// long-abandoned gym caps at 2.5 (~35 days) so it doesn't drown out everything.
const VISIT_RAMP_DAYS = 14;
const MAX_VISIT_FACTOR = 2.5;
const NEVER_VISITED_FACTOR = 1.0;

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

  const label: FreshLabel = {
    freshSections: freshSectionIds.length,
    totalSections: sections.length,
    countedBoulders,
    hasUncountedResets,
  };

  const visitFactor = computeVisitFactor(daysSinceVisit);
  const substance = computeSubstance(label, freshResetCount);
  const noveltyScore = visitFactor * substance;

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

function computeVisitFactor(daysSinceVisit: number | null): number {
  if (daysSinceVisit === null) return NEVER_VISITED_FACTOR;
  return Math.min(daysSinceVisit / VISIT_RAMP_DAYS, MAX_VISIT_FACTOR);
}

function computeSubstance(label: FreshLabel, freshResetCount: number): number {
  if (label.freshSections === 0) return 0;

  // Multi-sector gyms: sectors are spatial regions, so coverage is meaningful.
  // Floor at 0.6 so a small partial reset isn't crushed; ceiling at 1.0.
  if (label.totalSections > 1) {
    return 0.6 + 0.4 * (label.freshSections / label.totalSections);
  }

  // Single-sector gyms (whole gym is one announcement). Boulder count is the
  // honest signal when we have it.
  if (label.countedBoulders >= 20) return 0.95;
  if (label.countedBoulders >= 10) return 0.85;
  if (label.countedBoulders >= 5) return 0.75;

  // Uncounted reset rows ≈ reset events for single-sector gyms (they typically
  // log one row per weekly drop), so more rows ⇒ more accumulated novelty.
  if (freshResetCount >= 3) return 0.90;
  if (freshResetCount >= 2) return 0.80;
  return 0.70;
}
