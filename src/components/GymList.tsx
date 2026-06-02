"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useVisitLog } from "@/lib/visit-log";
import { rankGyms, type GymRanking } from "@/lib/freshness";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymNoDataCard } from "@/components/gym/GymNoDataCard";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const { visits, history, setVisits, writeError } = useVisitLog(authed);
  const liveRanking = useMemo(() => rankGyms(gyms, visits), [gyms, visits]);
  const { hero, heroHasData, runnersUp, noDataExtras } = hydrated ? liveRanking : initialRanking;

  if (!hero) return null;

  return (
    <div className="flex flex-col gap-10">
      {writeError && (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn&rsquo;t save your visit, your browser may be blocking storage or out of space.
          </AlertDescription>
        </Alert>
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
          {/* Mobile: one stacked column preserves rank order top-to-bottom.
              Desktop: two independent flex columns so expanding a card only
              grows its own column — the sibling column stays put. Indexes
              alternate between columns so the z-shape reading order matches
              the ranking (rank 1 top-left, rank 2 top-right, rank 3 mid-left). */}
          <div className="flex flex-col gap-8 sm:hidden">
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
          <div className="hidden sm:grid sm:grid-cols-2 sm:items-start sm:gap-8">
            {[0, 1].map((col) => (
              <div key={col} className="flex flex-col gap-8">
                {runnersUp
                  .filter((_, i) => i % 2 === col)
                  .map((scored) => (
                    <GymCard
                      key={scored.gym.id}
                      scored={scored}
                      variant="compact"
                      visitedDates={history[scored.gym.slug] ?? []}
                      onChangeVisits={(dates) => setVisits(scored.gym.slug, dates)}
                    />
                  ))}
              </div>
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
