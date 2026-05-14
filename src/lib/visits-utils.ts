import type { VisitHistory, Visits } from "@/lib/types";

export function historyToLatestVisits(history: VisitHistory): Visits {
  const latest: Visits = {};
  for (const [slug, dates] of Object.entries(history)) {
    if (dates.length === 0) continue;
    latest[slug] = dates.reduce((max, d) => (d > max ? d : max));
  }
  return latest;
}
