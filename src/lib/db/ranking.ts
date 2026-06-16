import { unstable_cache } from "next/cache";
import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { rankGyms, type GymRanking } from "@/lib/freshness";
import { parseVisitsCookie } from "@/lib/visit-log";
import type { GymWithSections } from "@/lib/types";

const ONE_DAY_SECONDS = 24 * 60 * 60;

// Cache key = (visitsCookieRaw, todayISO). Users with the same visit
// pattern share an entry — notably, anyone with no cookie collapses to
// one. todayISO rotates the key once per calendar day so the Date.now()
// captured inside daysSince() never drifts more than a day, which is
// well within visitFactor's resolution.
// Tagged "gyms" so admin reset/approve actions invalidate this alongside
// the inner gyms cache via revalidateTag("gyms").
export const getRankedGyms = unstable_cache(
  async (
    visitsCookieRaw: string,
    todayISO: string,
  ): Promise<{ gyms: GymWithSections[]; ranking: GymRanking }> => {
    void todayISO;

    const gyms = await getActiveGymsWithSections();
    const visits = parseVisitsCookie(visitsCookieRaw || undefined);
    const ranking = rankGyms(gyms, visits);

    return { gyms, ranking };
  },
  ["ranked-gyms"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);
