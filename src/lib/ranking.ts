import { gymFreshness, mostRecentReset, type FreshLabel } from "@/lib/freshness";
import { freshnessTier, type Tier } from "@/lib/tier";
import type { GymWithSections } from "@/lib/types";
import type { Visits } from "@/hooks/useVisits";

export type RankedGym = {
  gym: GymWithSections;
  lastVisited: string | null;
  freshSectionIds: Set<string>;
  label: FreshLabel | null;
  tier: Tier;
  hasResetData: boolean;
  mostRecentFreshISO: string | null;
};

export type GymRanking = {
  hero: RankedGym | null;
  heroHasData: boolean;
  runnersUp: RankedGym[];
  noDataExtras: RankedGym[];
};

// Pure ranking function. Given a list of gyms and the user's per-gym latest
// visit dates, returns the home-page ordering: hero card + runners-up + a
// bottom list of gyms with no reset data. Sort key is the novelty score
// (`freshResetCount * min(daysSinceVisit / 7, 1)`); ties are broken by the
// most recent fresh reset date.
export function rankGyms(gyms: GymWithSections[], visits: Visits): GymRanking {
  const computed = gyms.map((gym) => {
    const lastVisited = visits[gym.slug] ?? null;
    const freshness = gymFreshness(gym, lastVisited);
    const recent = mostRecentReset(gym.sections);
    return {
      gym,
      lastVisited,
      freshSectionIds: freshness.freshSectionIds,
      noveltyScore: freshness.noveltyScore,
      mostRecentFreshISO: freshness.mostRecentFreshISO,
      hasResetData: freshness.hasResetData,
      label: freshness.label,
      tier: freshnessTier(freshness),
      recent,
    };
  });

  const withData = computed
    .filter((c) => c.hasResetData)
    .sort((a, b) => {
      const byScore = b.noveltyScore - a.noveltyScore;
      if (byScore !== 0) return byScore;
      const ar = a.mostRecentFreshISO ?? a.recent?.reset_on ?? "";
      const br = b.mostRecentFreshISO ?? b.recent?.reset_on ?? "";
      return br.localeCompare(ar);
    });
  const withoutData = computed.filter((c) => !c.hasResetData);

  const hero = withData[0] ?? withoutData[0] ?? null;
  const heroHasData = withData[0] != null;
  const runnersUp = withData[0] ? withData.slice(1) : withoutData.slice(1);
  const noDataExtras = withData.length > 0 ? withoutData : withoutData.slice(1);

  return { hero, heroHasData, runnersUp, noDataExtras };
}
