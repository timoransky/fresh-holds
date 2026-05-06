import type { GymWithSections } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreshLabel =
  | { kind: "sections"; count: number; total: number }
  | { kind: "boulders"; count: number };

export type FreshnessResult = {
  freshSectionIds: Set<string>;
  freshResetCount: number;
  mostRecentFreshISO: string | null;
  hasResetData: boolean;
  label: FreshLabel | null;
};

export function gymFreshness(
  gym: GymWithSections,
  lastVisitedISO: string | null,
): FreshnessResult {
  const freshSectionIds = new Set<string>();
  const sections = gym.sections;
  const hasResetData = sections.some((s) => s.resets.length > 0);

  if (sections.length === 0 || !hasResetData) {
    return {
      freshSectionIds,
      freshResetCount: 0,
      mostRecentFreshISO: null,
      hasResetData: false,
      label: null,
    };
  }

  const visitedTime = lastVisitedISO === null ? -Infinity : Date.parse(lastVisitedISO);

  let freshResetCount = 0;
  let mostRecentFreshISO: string | null = null;
  let freshBoulderSum = 0;

  for (const section of sections) {
    let sectionHasFresh = false;
    for (const reset of section.resets) {
      if (Date.parse(reset.reset_on) > visitedTime) {
        freshResetCount += 1;
        freshBoulderSum += reset.boulders_reset ?? 0;
        if (mostRecentFreshISO === null || reset.reset_on > mostRecentFreshISO) {
          mostRecentFreshISO = reset.reset_on;
        }
        sectionHasFresh = true;
      }
    }
    if (sectionHasFresh) freshSectionIds.add(section.id);
  }

  const label: FreshLabel =
    gym.freshness_mode === "count"
      ? { kind: "boulders", count: freshBoulderSum }
      : { kind: "sections", count: freshSectionIds.size, total: sections.length };

  return {
    freshSectionIds,
    freshResetCount,
    mostRecentFreshISO,
    hasResetData: true,
    label,
  };
}

export function mostRecentReset(
  sections: GymWithSections["sections"],
): { reset_on: string; section_name: string } | null {
  let best: { reset_on: string; section_name: string } | null = null;
  for (const section of sections) {
    for (const reset of section.resets) {
      if (best === null || reset.reset_on > best.reset_on) {
        best = { reset_on: reset.reset_on, section_name: section.name };
      }
    }
  }
  return best;
}

export function daysSince(isoDate: string): number {
  const diff = Date.now() - Date.parse(isoDate);
  return Math.floor(diff / DAY_MS);
}

export function relativeDay(isoDate: string): string {
  const days = daysSince(isoDate);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days <= 30) return `${days} days ago`;
  if (days <= 60) return "~1 month ago";
  if (days <= 365) return `~${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "~1 year ago" : `~${years} years ago`;
}

export function describeFreshness(
  label: FreshLabel | null,
  lastVisitedISO: string | null,
): string {
  if (label === null) return "No reset data — check for yourself.";

  if (lastVisitedISO === null) {
    if (label.kind === "sections") {
      return `Never visited — all ${label.total} ${pluralize(label.total, "sector")} are new for you.`;
    }
    return `Never visited — ${label.count} new ${pluralize(label.count, "boulder")} logged for you.`;
  }

  if (label.kind === "sections") {
    return `${label.count} of ${label.total} ${pluralize(label.total, "sector")} are fresh since your last visit.`;
  }
  return `${label.count} new ${pluralize(label.count, "boulder")} since your last visit.`;
}

export function badgeCountLabel(label: FreshLabel): string {
  if (label.kind === "sections") {
    return `fresh ${pluralize(label.count, "sector")}`;
  }
  return `new ${pluralize(label.count, "boulder")}`;
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
