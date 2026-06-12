import type { GymWithSections, Section } from "@/lib/types";
import type { Visits } from "@/lib/visit-log";
import type { Tier } from "@/lib/tier";
import { gymFreshness, type FreshLabel } from "@/lib/freshness/scoring";
import { describeFreshness } from "@/lib/freshness/narrative";
import {
  mostRecentReset,
  sortSectionsByDisplay,
  sortSectionsByRecent,
} from "@/lib/freshness/sort";
import { bindTier } from "@/lib/freshness/tier-binding";
import {
  isCompactSectorGym,
  recentResets,
  type RecentReset,
} from "@/lib/freshness/recent-resets";

export { mostRecentReset } from "@/lib/freshness/sort";
export { isCompactSectorGym } from "@/lib/freshness/recent-resets";
export type { FreshLabel } from "@/lib/freshness/scoring";
export type { RecentReset } from "@/lib/freshness/recent-resets";

export type ScoredGym = {
  gym: GymWithSections;
  lastVisited: string | null;

  noveltyScore: number;
  hasResetData: boolean;
  freshSectionIds: string[];
  freshResetCount: number;

  mostRecentFreshISO: string | null;
  mostRecentResetISO: string | null;

  tier: Tier;
  label: FreshLabel | null;

  sectionsByDisplay: Section[];
  sectionsByRecent: Section[];
  recentResets: RecentReset[];
  isCompactSectors: boolean;

  narrative: string;
};

export type RankedGym = ScoredGym;

export type GymRanking = {
  hero: ScoredGym | null;
  heroHasData: boolean;
  runnersUp: ScoredGym[];
  noDataExtras: ScoredGym[];
};

export function scoreGym(gym: GymWithSections, lastVisited: string | null): ScoredGym {
  const freshness = gymFreshness(gym, lastVisited);
  const tier = bindTier(freshness);
  const mostRecentResetISO = mostRecentReset(gym.sections)?.reset_on ?? null;

  return {
    gym,
    lastVisited,

    noveltyScore: freshness.noveltyScore,
    hasResetData: freshness.hasResetData,
    freshSectionIds: freshness.freshSectionIds,
    freshResetCount: freshness.freshResetCount,

    mostRecentFreshISO: freshness.mostRecentFreshISO,
    mostRecentResetISO,

    tier,
    label: freshness.label,

    sectionsByDisplay: sortSectionsByDisplay(gym.sections),
    sectionsByRecent: sortSectionsByRecent(gym.sections),
    recentResets: recentResets(gym.sections, lastVisited),
    isCompactSectors: isCompactSectorGym(gym.sections),

    narrative: describeFreshness(
      tier.key,
      freshness.label,
      lastVisited,
      freshness.mostRecentFreshISO,
      freshness.freshResetCount,
    ),
  };
}

export function rankGyms(gyms: GymWithSections[], visits: Visits): GymRanking {
  const scored = gyms.map((gym) => scoreGym(gym, visits[gym.slug] ?? null));

  const withData = scored
    .filter((s) => s.hasResetData)
    .sort((a, b) => {
      const byScore = b.noveltyScore - a.noveltyScore;
      if (byScore !== 0) return byScore;
      const ar = a.mostRecentFreshISO ?? a.mostRecentResetISO ?? "";
      const br = b.mostRecentFreshISO ?? b.mostRecentResetISO ?? "";
      const byRecent = br.localeCompare(ar);
      if (byRecent !== 0) return byRecent;
      // Anon scores are pure recency, so two gyms reset on the same day tie
      // exactly — the one with more drops this month wins.
      return b.freshResetCount - a.freshResetCount;
    });
  const withoutData = scored.filter((s) => !s.hasResetData);

  const hero = withData[0] ?? withoutData[0] ?? null;
  const heroHasData = withData[0] != null;
  const runnersUp = withData[0] ? withData.slice(1) : withoutData.slice(1);
  const noDataExtras = withData.length > 0 ? withoutData : withoutData.slice(1);

  return { hero, heroHasData, runnersUp, noDataExtras };
}
