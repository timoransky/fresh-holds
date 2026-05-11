"use client";

import { useSyncedVisits } from "@/hooks/useSyncedVisits";
import { useGymRanking } from "@/hooks/useGymRanking";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymNoDataCard } from "@/components/gym/GymNoDataCard";

type Props = {
  gyms: GymWithSections[];
  authed: boolean;
};

export function GymList({ gyms, authed }: Props) {
  const { visits, history, setVisits } = useSyncedVisits(authed);
  const { hero, heroHasData, runnersUp, noDataExtras } = useGymRanking(gyms, visits);

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
