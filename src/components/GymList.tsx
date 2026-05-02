"use client";

import { useMemo, useState } from "react";
import { useVisits } from "@/hooks/useVisits";
import { gymFreshness, mostRecentReset } from "@/lib/freshness";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";

type Props = {
  gyms: GymWithSections[];
};

export function GymList({ gyms }: Props) {
  const { visits, history, setVisits } = useVisits();
  const [openGymId, setOpenGymId] = useState<string | null>(null);

  const computed = useMemo(() => {
    return gyms.map((gym) => {
      const lastVisited = visits[gym.slug] ?? null;
      const freshness = gymFreshness(gym.sections, lastVisited);
      const recent = mostRecentReset(gym.sections);
      return {
        gym,
        lastVisited,
        percent: freshness.percent,
        freshSectionIds: freshness.freshSectionIds,
        recent,
      };
    });
  }, [gyms, visits]);

  const sorted = useMemo(() => {
    const withData = computed
      .filter((c) => c.percent !== null)
      .sort((a, b) => {
        const byPercent = (b.percent ?? 0) - (a.percent ?? 0);
        if (byPercent !== 0) return byPercent;
        const ar = a.recent?.reset_on ?? "";
        const br = b.recent?.reset_on ?? "";
        return br.localeCompare(ar);
      });
    const withoutData = computed.filter((c) => c.percent === null);
    return { withData, withoutData };
  }, [computed]);

  const hero = sorted.withData[0] ?? sorted.withoutData[0] ?? null;
  const runnersUp = sorted.withData[0] ? sorted.withData.slice(1) : sorted.withoutData.slice(1);
  const noDataExtras =
    sorted.withData.length > 0 ? sorted.withoutData : sorted.withoutData.slice(1);

  if (!hero) return null;

  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Top pick">
        <GymCard
          gym={hero.gym}
          percent={hero.percent}
          freshSectionIds={hero.freshSectionIds}
          variant="hero"
          expanded
          onToggle={() => {}}
          visitedDates={history[hero.gym.slug] ?? []}
          onChangeVisits={(dates) => setVisits(hero.gym.slug, dates)}
        />
      </section>

      {runnersUp.length > 0 && (
        <section aria-label="Other gyms" className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            also worth a look
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {runnersUp.map((c) => (
              <GymCard
                key={c.gym.id}
                gym={c.gym}
                percent={c.percent}
                freshSectionIds={c.freshSectionIds}
                variant="compact"
                expanded={c.gym.id === openGymId}
                onToggle={() => setOpenGymId((prev) => (prev === c.gym.id ? null : c.gym.id))}
                visitedDates={history[c.gym.slug] ?? []}
                onChangeVisits={(dates) => setVisits(c.gym.slug, dates)}
              />
            ))}
          </div>
        </section>
      )}

      {noDataExtras.length > 0 && (
        <section aria-label="Gyms with no reset data" className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            no reset data yet
          </h2>
          <ul className="flex flex-col gap-2">
            {noDataExtras.map((c) => (
              <li
                key={c.gym.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-foreground/15 bg-background/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.gym.name}</p>
                  {c.gym.neighborhood && (
                    <p className="text-xs text-muted-foreground">{c.gym.neighborhood}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  no data
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
