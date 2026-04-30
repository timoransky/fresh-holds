import type { Section } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreshnessResult = {
  percent: number | null;
  freshSectionIds: Set<string>;
};

export function gymFreshness(sections: Section[], lastVisitedISO: string | null): FreshnessResult {
  const freshSectionIds = new Set<string>();
  const hasAnyResets = sections.some((s) => s.resets.length > 0);

  if (sections.length === 0 || !hasAnyResets) {
    return { percent: null, freshSectionIds };
  }

  if (lastVisitedISO === null) {
    for (const section of sections) {
      freshSectionIds.add(section.id);
    }
    return { percent: 100, freshSectionIds };
  }

  const visitedTime = Date.parse(lastVisitedISO);
  for (const section of sections) {
    const isFresh = section.resets.some((r) => Date.parse(r.reset_on) > visitedTime);
    if (isFresh) freshSectionIds.add(section.id);
  }

  const percent = Math.round((freshSectionIds.size / sections.length) * 100);
  return { percent, freshSectionIds };
}

export function mostRecentReset(
  sections: Section[],
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
  if (days <= 60) return "about a month ago";
  if (days <= 365) return `~${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "~1 year ago" : `~${years} years ago`;
}
