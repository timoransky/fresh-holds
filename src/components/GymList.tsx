"use client";

import { useSyncExternalStore } from "react";
import { useSyncedVisits } from "@/hooks/useSyncedVisits";
import { useGymRanking } from "@/hooks/useGymRanking";
import type { GymRanking } from "@/lib/freshness";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymNoDataCard } from "@/components/gym/GymNoDataCard";

type Props = {
  gyms: GymWithSections[];
  authed: boolean;
  initialRanking: GymRanking;
};

const subscribeHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getHydrationServerSnapshot = () => false;

export function GymList({ gyms, authed, initialRanking }: Props) {
  // True after first commit; false on server and during hydration. Lets
  // us render the server-computed initialRanking on first paint (matching
  // the HTML exactly) and switch to liveRanking afterward — which is
  // value-identical in steady state and diverges on clicks or drift.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getHydrationServerSnapshot,
  );

  const { visits, history, setVisits, writeError } = useSyncedVisits(authed);
  const liveRanking = useGymRanking(gyms, visits);
  const { hero, heroHasData, runnersUp, noDataExtras } = hydrated ? liveRanking : initialRanking;

  if (!hero) return null;

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
          scored={hero}
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
            {runnersUp.map((scored) => (
              <GymCard
                key={scored.gym.id}
                scored={scored}
                variant="compact"
                visitedDates={history[scored.gym.slug] ?? []}
                onChangeVisits={(dates) => setVisits(scored.gym.slug, dates)}
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
