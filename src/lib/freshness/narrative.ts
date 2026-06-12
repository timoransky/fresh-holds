import { daysSince, relativeDay } from "@/lib/date";
import type { FreshLabel } from "@/lib/freshness/scoring";
import type { TierKey } from "@/lib/tier";

// The card line speaks two voices (see ADR-0003):
//
// - Returning (a visit is logged for this gym): anchored to "since your visit" —
//   the counts and dates are personal and exact.
// - Anon (no visit logged for this gym): there is no personal anchor, so the
//   line describes the gym's activity instead - when it last reset and how busy
//   the month was. It never says "fresh for you" or "never visited"; we don't
//   actually know either.
//
// Each line is data first, then the tier's punchline, so the badge and the
// sentence tell one story.
export function describeFreshness(
  tier: TierKey,
  label: FreshLabel | null,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
  freshResetCount: number,
): string {
  if (label === null) return "No reset data - you have to check for yourself.";

  return lastVisitedISO === null
    ? describeForAnon(tier, mostRecentFreshISO)
    : describeForReturning(tier, lastVisitedISO, mostRecentFreshISO, freshResetCount);
}

function describeForAnon(
  tier: TierKey,
  mostRecentFreshISO: string | null,
): string {
  if (tier === "stale" || mostRecentFreshISO === null) {
    return "Quiet lately - no resets in the last month. Running on old plastic.";
  }

  const latest = `Last reset ${relativeDay(mostRecentFreshISO)}`;

  switch (tier) {
    case "hot":
      return `${latest} - get on it before the chalk builds up.`;
    case "fresh":
      return `${latest} - plenty of fresh plastic.`;
    case "worth":
      return `${latest} - worth a session.`;
    default:
      return `${latest} - slim pickings right now.`;
  }
}

function describeForReturning(
  tier: TierKey,
  lastVisitedISO: string,
  mostRecentFreshISO: string | null,
  freshResetCount: number,
): string {
  if (freshResetCount === 0 || mostRecentFreshISO === null) {
    if (daysSince(lastVisitedISO) <= 0) {
      return "Nothing new since you visited today.";
    }
    return `Nothing new since your last visit ${relativeDay(lastVisitedISO)}.`;
  }

  const latest = relativeDay(mostRecentFreshISO);
  const resets = `${freshResetCount} ${pluralize(freshResetCount, "reset")}`;

  switch (tier) {
    case "hot":
      return `${resets} piled up since your visit, the latest ${latest} - practically a new gym.`;
    case "fresh":
      return `${resets} since your visit, the latest ${latest} - it's stacking up.`;
    case "worth":
      return `${resets} since your visit, the latest ${latest} - decent pickings.`;
    default:
      return `${resets} since your visit, the latest ${latest} - thin, but it's something.`;
  }
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
