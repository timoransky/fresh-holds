import { daysSince, relativeDay } from "@/lib/date";
import type { FreshLabel } from "@/lib/freshness/scoring";

export function describeFreshness(
  label: FreshLabel | null,
  freshResetCount: number,
  lastVisitedISO: string | null,
  mostRecentFreshISO: string | null,
): string {
  if (label === null) return "No reset data - you have to check for yourself.";

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
  const sectors = label.sectors;
  const boulders = label.boulders;
  const prefix = lastVisitedISO === null ? "Never visited - " : "";

  if (sectors !== null && sectors.count > 0) {
    let main: string;
    if (lastVisitedISO === null) {
      if (sectors.total === 1) {
        main = "one sector is fresh";
      } else if (sectors.count === sectors.total) {
        main = `all ${sectors.total} sectors fresh`;
      } else {
        main = `${sectors.count} of ${sectors.total} ${pluralize(sectors.total, "sector")} fresh`;
      }
    } else {
      main = `${sectors.count} of ${sectors.total} ${pluralize(sectors.total, "sector")} fresh`;
    }
    if (boulders !== null && boulders > 0) {
      main += ` + ${boulders} new ${pluralize(boulders, "boulder")} elsewhere`;
    }
    return `${prefix}${main}, last reset ${recent}.`;
  }

  if (boulders !== null && boulders > 0) {
    return `${prefix}${boulders} fresh ${pluralize(boulders, "boulder")}, last reset ${recent}.`;
  }

  // Fresh resets exist but no sector attribution and no boulder count.
  const main = freshResetCount === 1 ? "new boulders set" : `${freshResetCount} new drops`;
  return `${prefix}${main}, last reset ${recent}.`;
}

export type BadgeView = { count: number | null; text: string };

export function chooseBadge(label: FreshLabel | null, freshResetCount: number): BadgeView {
  if (label === null) return { count: null, text: "" };

  const sectors = label.sectors;
  const boulders = label.boulders;

  // Prefer the most specific non-zero signal.
  if (sectors !== null && sectors.count > 0) {
    return { count: sectors.count, text: `fresh ${pluralize(sectors.count, "sector")}` };
  }
  if (boulders !== null && boulders > 0) {
    return { count: boulders, text: `new ${pluralize(boulders, "boulder")}` };
  }
  if (freshResetCount > 0) {
    // Reset(s) logged but no sector and no count — known-fresh, unquantified.
    return { count: null, text: "fresh" };
  }
  // Has reset data, but nothing fresh since last visit. Fall back to whichever
  // signal the gym carries so the badge still labels its shape.
  if (sectors !== null) {
    return { count: 0, text: `fresh ${pluralize(0, "sector")}` };
  }
  if (boulders !== null) {
    return { count: 0, text: `new ${pluralize(0, "boulder")}` };
  }
  return { count: 0, text: "fresh" };
}

function pluralize(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
