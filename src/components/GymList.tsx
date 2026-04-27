"use client";

import { useMemo, useState } from "react";
import { useVisits } from "@/hooks/useVisits";
import { gymFreshness, mostRecentReset } from "@/lib/freshness";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { GymDetail } from "@/components/GymDetail";

type Props = {
  gyms: GymWithSections[];
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GymList({ gyms }: Props) {
  const { visits, markVisited } = useVisits();
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
    const visited = computed
      .filter((c) => c.lastVisited !== null)
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
    const unvisited = computed
      .filter((c) => c.lastVisited === null)
      .sort((a, b) => {
        const ar = a.recent?.reset_on ?? "";
        const br = b.recent?.reset_on ?? "";
        return br.localeCompare(ar);
      });
    return [...visited, ...unvisited];
  }, [computed]);

  const freshestPickId = useMemo(() => {
    const top = sorted.find(
      (c) => c.lastVisited !== null && (c.percent ?? 0) > 0,
    );
    return top?.gym.id ?? null;
  }, [sorted]);

  const today = todayISO();
  const openGym = openGymId
    ? computed.find((c) => c.gym.id === openGymId)
    : null;

  return (
    <>
      <ul className="flex flex-col gap-3 sm:gap-4">
        {sorted.map((c) => (
          <li key={c.gym.id}>
            <GymCard
              gym={c.gym}
              percent={c.percent}
              freshSectionIds={c.freshSectionIds}
              isFreshestPick={c.gym.id === freshestPickId}
              visitedToday={c.lastVisited === today}
              onOpen={() => setOpenGymId(c.gym.id)}
              onMarkVisited={(isoDate) => markVisited(c.gym.slug, isoDate)}
            />
          </li>
        ))}
      </ul>
      {openGym && (
        <GymDetail
          gym={openGym.gym}
          percent={openGym.percent}
          freshSectionIds={openGym.freshSectionIds}
          visitedToday={openGym.lastVisited === today}
          open={openGym !== null}
          onOpenChange={(o) => !o && setOpenGymId(null)}
          onMarkVisited={(isoDate) => markVisited(openGym.gym.slug, isoDate)}
        />
      )}
    </>
  );
}
