import { daysSince, relativeDay } from "@/lib/date";

export function describeFreshness(
  hasResetData: boolean,
  freshResetCount: number,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
): string {
  if (!hasResetData) return "No reset data - you have to check for yourself.";

  if (freshResetCount === 0) {
    if (lastVisitedISO === null) {
      return "Resets logged, but nothing fresh yet.";
    }
    if (daysSince(lastVisitedISO) <= 0) {
      return "Nothing new since you visited today.";
    }
    return `Nothing new since your last visit ${relativeDay(lastVisitedISO)}.`;
  }

  const recent = relativeDay(mostRecentFreshISO!);
  const drop = pluralize(freshResetCount, "drop");

  if (lastVisitedISO === null) {
    return `Never visited - ${freshResetCount} recent ${drop}, latest ${recent}.`;
  }
  return `${freshResetCount} fresh ${drop} since your last visit, latest ${recent}.`;
}

export type BadgeView = { count: number | null; text: string };

export function chooseBadge(
  hasResetData: boolean,
  freshResetCount: number,
): BadgeView {
  if (!hasResetData) return { count: null, text: "" };
  return {
    count: freshResetCount,
    text: `fresh ${pluralize(freshResetCount, "drop")}`,
  };
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
