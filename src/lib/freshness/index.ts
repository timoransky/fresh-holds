import type { GymWithSections, Section } from "@/lib/types";
import type { Visits } from "@/lib/visit-log";
import type { Tier } from "@/lib/tier";
import { gymFreshness, type FreshLabel } from "@/lib/freshness/scoring";
import { badgeCountLabel, badgeCountNumber, describeFreshness } from "@/lib/freshness/narrative";
import {
  mostRecentReset,
  sortSectionsByDisplay,
  sortSectionsByRecent,
} from "@/lib/freshness/sort";
import { bindTier } from "@/lib/freshness/tier-binding";

export { mostRecentReset } from "@/lib/freshness/sort";
export type { FreshLabel } from "@/lib/freshness/scoring";

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
  badgeNumber: number;

  sectionsByDisplay: Section[];
  sectionsByRecent: Section[];

  narrative: string;
  badgeText: string;
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
    badgeNumber: freshness.label === null ? 0 : badgeCountNumber(freshness.label),

    sectionsByDisplay: sortSectionsByDisplay(gym.sections),
    sectionsByRecent: sortSectionsByRecent(gym.sections),

    narrative: describeFreshness(
      freshness.label,
      lastVisited,
      freshness.mostRecentFreshISO,
      freshness.freshResetCount,
    ),
    badgeText: freshness.label === null ? "" : badgeCountLabel(freshness.label),
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
      return br.localeCompare(ar);
    });
  const withoutData = scored.filter((s) => !s.hasResetData);

  const hero = withData[0] ?? withoutData[0] ?? null;
  const heroHasData = withData[0] != null;
  const runnersUp = withData[0] ? withData.slice(1) : withoutData.slice(1);
  const noDataExtras = withData.length > 0 ? withoutData : withoutData.slice(1);

  return { hero, heroHasData, runnersUp, noDataExtras };
}
