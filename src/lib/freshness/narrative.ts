import { daysSince, relativeDay } from "@/lib/date";
import type { FreshLabel } from "@/lib/freshness/scoring";

export function describeFreshness(
  label: FreshLabel | null,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
): string {
  if (label === null) return "No reset data - you have to check for yourself.";

  if (label.count === 0) {
    if (lastVisitedISO === null) {
      return "Resets logged, but no boulder counts yet.";
    }
    if (daysSince(lastVisitedISO) <= 0) {
      return "Nothing new since you visited today.";
    }
    return `Nothing new since your last visit ${relativeDay(lastVisitedISO)}.`;
  }

  if (lastVisitedISO === null) {
    const recent = relativeDay(mostRecentFreshISO!);
    if (label.kind === "sections") {
      if (label.total === 1) {
        return `Never visited - one sector is fresh, last reset ${recent}.`;
      }
      return `Never visited - all ${label.total} sectors fresh, last reset ${recent}.`;
    }
    return `Never visited - ${label.count} fresh ${pluralize(label.count, "boulder")}, last reset ${recent}.`;
  }

  const recent = relativeDay(mostRecentFreshISO!);
  if (label.kind === "sections") {
    return `${label.count} of ${label.total} ${pluralize(label.total, "sector")} fresh, last reset ${recent}.`;
  }
  return `${label.count} fresh ${pluralize(label.count, "boulder")}, last reset ${recent}.`;
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
