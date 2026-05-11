"use client";

import { useMemo } from "react";
import { useSyncedVisits } from "@/hooks/useSyncedVisits";
import { gymFreshness, mostRecentReset } from "@/lib/freshness";
import { freshnessTier } from "@/lib/tier";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymNoDataCard } from "@/components/gym/GymNoDataCard";

type Props = {
  gyms: GymWithSections[];
  authed: boolean;
};

export function GymList({ gyms, authed }: Props) {
  const { visits, history, setVisits } = useSyncedVisits(authed);

  const computed = useMemo(() => {
    return gyms.map((gym) => {
      const lastVisited = visits[gym.slug] ?? null;
      const freshness = gymFreshness(gym, lastVisited);
      const recent = mostRecentReset(gym.sections);
      return {
        gym,
        lastVisited,
        freshSectionIds: freshness.freshSectionIds,
        freshResetCount: freshness.freshResetCount,
        noveltyScore: freshness.noveltyScore,
        mostRecentFreshISO: freshness.mostRecentFreshISO,
        hasResetData: freshness.hasResetData,
        label: freshness.label,
        tier: freshnessTier(freshness),
        recent,
      };
    });
  }, [gyms, visits]);

  const sorted = useMemo(() => {
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
    return { withData, withoutData };
  }, [computed]);

  const hero = sorted.withData[0] ?? sorted.withoutData[0] ?? null;
  const heroHasData = sorted.withData[0] != null;
  const runnersUp = sorted.withData[0] ? sorted.withData.slice(1) : sorted.withoutData.slice(1);
  const noDataExtras =
    sorted.withData.length > 0 ? sorted.withoutData : sorted.withoutData.slice(1);

  if (!hero) return null;

  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Top pick" className="flex flex-col gap-4">
        {heroHasData && (
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            freshest for you today
          </h2>
        )}
        <GymCard
          gym={hero.gym}
          tier={hero.tier}
          freshSectionIds={hero.freshSectionIds}
          label={hero.label}
          lastVisited={hero.lastVisited}
          variant="hero"
          visitedDates={history[hero.gym.slug] ?? []}
          onChangeVisits={(dates) => setVisits(hero.gym.slug, dates)}
        />
      </section>

      {runnersUp.length > 0 && (
        <section aria-label="Other gyms" className="flex flex-col gap-4">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            also worth a look
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 items-start">
            {runnersUp.map((c) => (
              <GymCard
                key={c.gym.id}
                gym={c.gym}
                tier={c.tier}
                freshSectionIds={c.freshSectionIds}
                label={c.label}
                lastVisited={c.lastVisited}
                variant="compact"
                visitedDates={history[c.gym.slug] ?? []}
                onChangeVisits={(dates) => setVisits(c.gym.slug, dates)}
              />
            ))}
          </div>
        </section>
      )}

      {noDataExtras.length > 0 && (
        <section aria-label="Gyms with no reset data" className="flex flex-col gap-4">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            no reset data yet
          </h2>
          <ul className="flex flex-col gap-4">
            {noDataExtras.map((c) => (
              <GymNoDataCard key={c.gym.id} gym={c.gym} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
