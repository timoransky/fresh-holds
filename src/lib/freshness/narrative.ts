import { daysSince, relativeDay } from "@/lib/date";
import type { FreshLabel } from "@/lib/freshness/scoring";

export function describeFreshness(
  label: FreshLabel | null,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
): string {
  if (label === null) return "No reset data - you have to check for yourself.";

  if (label.freshSections === 0) {
    if (lastVisitedISO === null) {
      return "Resets logged, but nothing new yet.";
    }
    if (daysSince(lastVisitedISO) <= 0) {
      return "Nothing new since you visited today.";
    }
    return `Nothing new since your last visit ${relativeDay(lastVisitedISO)}.`;
  }

  const recent = relativeDay(mostRecentFreshISO!);
  const primary = primaryClause(label);
  const lastReset = `last reset ${recent}`;

  if (lastVisitedISO === null) {
    return `Never visited - ${primary}, ${lastReset}.`;
  }
  return `${capitalize(primary)}, ${lastReset}.`;
}

export function badgeCountLabel(label: FreshLabel): string {
  if (showBouldersFirst(label)) {
    return `new ${pluralize(label.countedBoulders, "boulder")}`;
  }
  return `fresh ${pluralize(label.freshSections, "sector")}`;
}

export function badgeCountNumber(label: FreshLabel): number {
  return showBouldersFirst(label) ? label.countedBoulders : label.freshSections;
}

function showBouldersFirst(label: FreshLabel): boolean {
  return label.totalSections === 1 && label.countedBoulders > 0;
}

function primaryClause(label: FreshLabel): string {
  if (label.totalSections === 1) {
    if (label.countedBoulders > 0) {
      return `${boulderCount(label)} new ${pluralize(label.countedBoulders, "boulder")}`;
    }
    return "some boulders are fresh";
  }

  const sectorsClause =
    label.freshSections === label.totalSections
      ? `all ${label.totalSections} sectors fresh`
      : `${label.freshSections} of ${label.totalSections} sectors fresh`;

  if (label.countedBoulders > 0) {
    const count = `${boulderCount(label)} new ${pluralize(label.countedBoulders, "boulder")}`;
    return `${sectorsClause} · ${count}`;
  }
  return sectorsClause;
}

function boulderCount(label: FreshLabel): string {
  return label.hasUncountedResets ? `${label.countedBoulders}+` : `${label.countedBoulders}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
