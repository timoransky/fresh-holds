"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AtSignIcon, GlobeIcon, NavigationIcon } from "lucide-react";
import { useVisits } from "@/hooks/useVisits";
import { gymFreshness, mostRecentReset } from "@/lib/freshness";
import { freshnessTier } from "@/lib/tier";
import type { GymWithSections } from "@/lib/types";
import { GymCard } from "@/components/GymCard";
import { Button } from "@/components/ui/button";

type Props = {
  gyms: GymWithSections[];
};

export function GymList({ gyms }: Props) {
  const { visits, history, setVisits } = useVisits();
  const [openGymId, setOpenGymId] = useState<string | null>(null);

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
  const runnersUp = sorted.withData[0] ? sorted.withData.slice(1) : sorted.withoutData.slice(1);
  const noDataExtras =
    sorted.withData.length > 0 ? sorted.withoutData : sorted.withoutData.slice(1);

  if (!hero) return null;

  return (
    <div className="flex flex-col gap-10">
      <section aria-label="Top pick">
        <GymCard
          gym={hero.gym}
          tier={hero.tier}
          freshSectionIds={hero.freshSectionIds}
          label={hero.label}
          lastVisited={hero.lastVisited}
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
                tier={c.tier}
                freshSectionIds={c.freshSectionIds}
                label={c.label}
                lastVisited={c.lastVisited}
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
          <ul className="flex flex-col gap-3">
            {noDataExtras.map((c) => {
              const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                [c.gym.name, c.gym.neighborhood, "Bratislava"].filter(Boolean).join(" "),
              )}`;
              const instagramUrl = c.gym.instagram_handle
                ? `https://instagram.com/${c.gym.instagram_handle.replace(/^@/, "")}`
                : null;
              return (
                <li
                  key={c.gym.id}
                  style={
                    {
                      "--surface-stroke": "oklch(0.85 0.015 270)",
                      "--surface-shadow": "oklch(0.55 0.02 270 / 0.15)",
                    } as CSSProperties
                  }
                  className="squircle-3xl flex items-center justify-between gap-3 rounded-2xl border-2 border-(--surface-stroke) bg-background p-4 sm:px-5 shadow-[0_2px_0_0_var(--surface-stroke),0_12px_32px_-12px_var(--surface-shadow)]"
                >
                  <div className="min-w-0">
                    <h2 className="font-bold tracking-tight text-foreground truncate text-lg">
                      {c.gym.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      No reset data — check for yourself
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="icon-sm" className="rounded-full">
                      <a
                        href={navigateUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${c.gym.name} in Google Maps`}
                      >
                        <NavigationIcon />
                      </a>
                    </Button>
                    {c.gym.website_url && (
                      <Button asChild variant="outline" size="icon-sm" className="rounded-full">
                        <a
                          href={c.gym.website_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${c.gym.name} website`}
                        >
                          <GlobeIcon />
                        </a>
                      </Button>
                    )}
                    {instagramUrl && (
                      <Button asChild variant="outline" size="icon-sm" className="rounded-full">
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${c.gym.name} on Instagram`}
                        >
                          <AtSignIcon />
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
