import type { GymWithResets, Reset } from "@/lib/types";
import type { Visits } from "@/lib/visit-log";
import type { Tier } from "@/lib/tier";
import { gymFreshness } from "@/lib/freshness/scoring";
import { chooseBadge, describeFreshness } from "@/lib/freshness/narrative";
import { resetsByRecent } from "@/lib/freshness/sort";
import { bindTier } from "@/lib/freshness/tier-binding";

export { WEEKLY_VISIT_DAYS } from "@/lib/freshness/scoring";
export { mostRecentReset, resetsByRecent } from "@/lib/freshness/sort";

export type ScoredGym = {
  gym: GymWithResets;
  lastVisited: string | null;

  noveltyScore: number;
  hasResetData: boolean;
  freshResetCount: number;

  mostRecentFreshISO: string | null;
  mostRecentResetISO: string | null;

  tier: Tier;

  resets: Reset[];

  narrative: string;
  badgeCount: number | null;
  badgeText: string;
};

export type RankedGym = ScoredGym;

export type GymRanking = {
  hero: ScoredGym | null;
  heroHasData: boolean;
  runnersUp: ScoredGym[];
  noDataExtras: ScoredGym[];
};

export function scoreGym(gym: GymWithResets, lastVisited: string | null): ScoredGym {
  const freshness = gymFreshness(gym, lastVisited);
  const tier = bindTier(freshness);
  const badge = chooseBadge(freshness.hasResetData, freshness.freshResetCount);

  return {
    gym,
    lastVisited,

    noveltyScore: freshness.noveltyScore,
    hasResetData: freshness.hasResetData,
    freshResetCount: freshness.freshResetCount,

    mostRecentFreshISO: freshness.mostRecentFreshISO,
    mostRecentResetISO: freshness.mostRecentResetISO,

    tier,

    resets: resetsByRecent(gym),

    narrative: describeFreshness(
      freshness.hasResetData,
      freshness.freshResetCount,
      lastVisited,
      freshness.mostRecentFreshISO,
    ),
    badgeCount: badge.count,
    badgeText: badge.text,
  };
}

export function rankGyms(gyms: GymWithResets[], visits: Visits): GymRanking {
  const scored = gyms.map((gym) => scoreGym(gym, visits[gym.slug] ?? null));

  const withData = scored
    .filter((s) => s.hasResetData)
    .sort((a, b) => {
      const byScore = b.noveltyScore - a.noveltyScore;
      if (byScore !== 0) return byScore;
      const ar = a.mostRecentFreshISO ?? a.mostRecentResetISO ?? "";
      const br = b.mostRecentFreshISO ?? b.mostRecentResetISO ?? "";
      return br.localeCompare(ar);
    });
  const withoutData = scored.filter((s) => !s.hasResetData);

  const hero = withData[0] ?? withoutData[0] ?? null;
  const heroHasData = withData[0] != null;
  const runnersUp = withData[0] ? withData.slice(1) : withoutData.slice(1);
  const noDataExtras = withData.length > 0 ? withoutData : withoutData.slice(1);

  return { hero, heroHasData, runnersUp, noDataExtras };
}
