import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { rankGyms, type GymRanking } from "@/lib/freshness";
import { parseVisitsCookie } from "@/lib/visit-log";
import type { GymWithSections } from "@/lib/types";

// Ranking is a pure, cheap CPU pass over the cached gym data, so it runs
// uncached on every request. The only cache entry is getActiveGymsWithSections
// (the DB fetch, tagged "gyms"), which admin writes invalidate via
// revalidateTag("gyms", { expire: 0 }). Computing the ranking fresh per request
// keeps novelty scores aligned with the current time (rankGyms reads Date.now()
// through daysSince) and removes the nested-cache staleness that a second cache
// layer here used to introduce. See ADR-0001.
export async function getRankedGyms(
  visitsCookieRaw: string,
): Promise<{ gyms: GymWithSections[]; ranking: GymRanking }> {
  const gyms = await getActiveGymsWithSections();
  const visits = parseVisitsCookie(visitsCookieRaw || undefined);
  const ranking = rankGyms(gyms, visits);

  return { gyms, ranking };
}
