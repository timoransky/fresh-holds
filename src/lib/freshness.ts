import type { Section } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreshnessResult = {
  percent: number | null;
  freshSectionIds: Set<string>;
};

export function gymFreshness(
  sections: Section[],
  lastVisitedISO: string | null,
): FreshnessResult {
  const freshSectionIds = new Set<string>();

  if (lastVisitedISO === null) {
    const cutoff = Date.now() - 7 * DAY_MS;
    for (const section of sections) {
      const isFresh = section.resets.some(
        (r) => Date.parse(r.reset_on) >= cutoff,
      );
      if (isFresh) freshSectionIds.add(section.id);
    }
    return { percent: null, freshSectionIds };
  }

  const visitedTime = Date.parse(lastVisitedISO);
  for (const section of sections) {
    const isFresh = section.resets.some(
      (r) => Date.parse(r.reset_on) > visitedTime,
    );
    if (isFresh) freshSectionIds.add(section.id);
  }

  if (sections.length === 0) {
    return { percent: 0, freshSectionIds };
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
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
