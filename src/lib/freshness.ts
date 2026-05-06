import type { GymWithSections, Section } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FreshLabel =
  | { kind: "sections"; count: number; total: number }
  | { kind: "boulders"; count: number; total: number };

export type FreshnessResult = {
  percent: number | null;
  freshSectionIds: Set<string>;
  label: FreshLabel | null;
};

export function gymFreshness(
  gym: GymWithSections,
  lastVisitedISO: string | null,
): FreshnessResult {
  const freshSectionIds = new Set<string>();
  const sections = gym.sections;
  const hasAnyResets = sections.some((s) => s.resets.length > 0);

  if (sections.length === 0 || !hasAnyResets) {
    return { percent: null, freshSectionIds, label: null };
  }

  if (gym.freshness_mode === "count") {
    return countFreshness(gym, sections, lastVisitedISO, freshSectionIds);
  }
  return sectionFreshness(sections, lastVisitedISO, freshSectionIds);
}

function sectionFreshness(
  sections: Section[],
  lastVisitedISO: string | null,
  freshSectionIds: Set<string>,
): FreshnessResult {
  if (lastVisitedISO === null) {
    for (const section of sections) freshSectionIds.add(section.id);
    return {
      percent: 100,
      freshSectionIds,
      label: { kind: "sections", count: sections.length, total: sections.length },
    };
  }

  const visitedTime = Date.parse(lastVisitedISO);
  for (const section of sections) {
    const isFresh = section.resets.some((r) => Date.parse(r.reset_on) > visitedTime);
    if (isFresh) freshSectionIds.add(section.id);
  }
  const percent = Math.round((freshSectionIds.size / sections.length) * 100);
  return {
    percent,
    freshSectionIds,
    label: { kind: "sections", count: freshSectionIds.size, total: sections.length },
  };
}

function countFreshness(
  gym: GymWithSections,
  sections: Section[],
  lastVisitedISO: string | null,
  freshSectionIds: Set<string>,
): FreshnessResult {
  const total = gym.total_boulders;
  if (total === null || total <= 0) {
    return { percent: null, freshSectionIds, label: null };
  }

  if (lastVisitedISO === null) {
    for (const section of sections) freshSectionIds.add(section.id);
    return {
      percent: 100,
      freshSectionIds,
      label: { kind: "boulders", count: total, total },
    };
  }

  const visitedTime = Date.parse(lastVisitedISO);
  let freshBoulders = 0;
  for (const section of sections) {
    let sectionHasFresh = false;
    for (const reset of section.resets) {
      if (Date.parse(reset.reset_on) > visitedTime) {
        sectionHasFresh = true;
        freshBoulders += reset.boulders_reset ?? 0;
      }
    }
    if (sectionHasFresh) freshSectionIds.add(section.id);
  }

  // Multiple resets since last visit can sum past total — cap so percent never exceeds 100.
  const cappedFresh = Math.min(freshBoulders, total);
  const percent = Math.round((cappedFresh / total) * 100);
  return {
    percent,
    freshSectionIds,
    label: { kind: "boulders", count: cappedFresh, total },
  };
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
    return `Never visited — all ${label.total} ${pluralize(label.total, "boulder")} are new for you.`;
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
