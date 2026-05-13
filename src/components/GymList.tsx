"use client";

import { useSyncExternalStore } from "react";
import { useSyncedVisits } from "@/hooks/useSyncedVisits";
import { useGymRanking } from "@/hooks/useGymRanking";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymListSkeleton } from "@/components/GymListSkeleton";
import { GymNoDataCard } from "@/components/gym/GymNoDataCard";

type Props = {
  gyms: GymWithSections[];
  authed: boolean;
  now: number;
};

const subscribeHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getHydrationServerSnapshot = () => false;

export function GymList({ gyms, authed, now }: Props) {
  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getHydrationServerSnapshot,
  );

  const { visits, history, setVisits, writeError } = useSyncedVisits(authed);
  const { hero, heroHasData, runnersUp, noDataExtras } = useGymRanking(gyms, visits, now);

  if (!isHydrated || !hero) return <GymListSkeleton />;

  return (
    <div className="flex flex-col gap-10">
      {writeError && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Couldn&rsquo;t save your visit — your browser may be blocking storage or out of space.
        </p>
      )}

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
          mostRecentFreshISO={hero.mostRecentFreshISO}
          variant="hero"
          visitedDates={history[hero.gym.slug] ?? []}
          onChangeVisits={(dates) => setVisits(hero.gym.slug, dates)}
          now={now}
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
                mostRecentFreshISO={c.mostRecentFreshISO}
                variant="compact"
                visitedDates={history[c.gym.slug] ?? []}
                onChangeVisits={(dates) => setVisits(c.gym.slug, dates)}
                now={now}
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
