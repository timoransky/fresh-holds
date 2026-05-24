import { daysSince, relativeDay } from "@/lib/date";
import type { FreshLabel } from "@/lib/freshness/scoring";

export function describeFreshness(
  label: FreshLabel | null,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
  freshResetCount: number,
): string {
  if (label === null) return "No reset data - you have to check for yourself.";

  if (freshResetCount === 0) {
    if (lastVisitedISO === null) {
      return "Resets logged, but nothing new yet.";
    }
    if (daysSince(lastVisitedISO) <= 0) {
      return "Nothing new since you visited today.";
    }
    return `Nothing new since your last visit ${relativeDay(lastVisitedISO)}.`;
  }

  const lastReset = `last reset ${relativeDay(mostRecentFreshISO!)}`;
  const resetWord = pluralize(freshResetCount, "reset");

  if (lastVisitedISO === null) {
    return `Never visited - ${freshResetCount} ${resetWord} logged, ${lastReset}.`;
  }
  return `${freshResetCount} new ${resetWord} since your last visit, ${lastReset}.`;
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

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
