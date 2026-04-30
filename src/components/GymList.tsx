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
  const [hasInteracted, setHasInteracted] = useState(false);

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
    return [...withData, ...withoutData];
  }, [computed]);

  const freshestPickId = useMemo(() => {
    const top = sorted.find((c) => c.lastVisited !== null && (c.percent ?? 0) > 0);
    return top?.gym.id ?? null;
  }, [sorted]);

  const effectiveOpenId = hasInteracted ? openGymId : (sorted[0]?.gym.id ?? null);

  const handleToggle = (id: string) => {
    setHasInteracted(true);
    setOpenGymId(effectiveOpenId === id ? null : id);
  };

  return (
    <ul className="flex flex-col gap-3 sm:gap-4">
      {sorted.map((c) => (
        <li key={c.gym.id}>
          <GymCard
            gym={c.gym}
            percent={c.percent}
            freshSectionIds={c.freshSectionIds}
            isFreshestPick={c.gym.id === freshestPickId}
            lastVisited={c.lastVisited}
            expanded={c.gym.id === effectiveOpenId}
            onToggle={() => handleToggle(c.gym.id)}
            visitedDates={history[c.gym.slug] ?? []}
            onChangeVisits={(dates) => setVisits(c.gym.slug, dates)}
          />
        </li>
      ))}
    </ul>
  );
}
