import { cacheLife, cacheTag } from "next/cache";
import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { rankGyms, type GymRanking } from "@/lib/freshness";
import { parseVisitsCookie } from "@/lib/visit-cookie";
import type { GymWithSections } from "@/lib/types";

// Cache key = (visitsCookieRaw, todayISO). Users with the same visit
// pattern share an entry — notably, anyone with no cookie collapses to
// one. todayISO is an opaque key participant: it rotates the entry once
// per calendar day so the Date.now() captured inside daysSince() never
// drifts more than a day, which is well within visitFactor's resolution.
// Tagged "gyms" so admin reset/approve actions (which already call
// updateTag("gyms")) invalidate this layer alongside the inner gyms cache.
export async function getRankedGyms(
  visitsCookieRaw: string,
  todayISO: string,
): Promise<{ gyms: GymWithSections[]; ranking: GymRanking }> {
  "use cache";
  cacheTag("gyms");
  cacheLife("days");

  void todayISO;

  const gyms = await getActiveGymsWithSections();
  const visits = parseVisitsCookie(visitsCookieRaw || undefined);
  const ranking = rankGyms(gyms, visits);
  return { gyms, ranking };
}
