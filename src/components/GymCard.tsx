"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import type { GymWithSections } from "@/lib/types";
import { describeFreshness, mostRecentReset, type FreshLabel } from "@/lib/freshness";
import { VisitedButton } from "@/components/VisitedButton";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { GymExternalLinks } from "@/components/gym/GymExternalLinks";
import { GymResetTable } from "@/components/gym/GymResetTable";
import { tierCardStyle, type Tier } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact";

type Props = {
  gym: GymWithSections;
  tier: Tier;
  freshSectionIds: Set<string>;
  label: FreshLabel | null;
  lastVisited: string | null;
  mostRecentFreshISO: string | null;
  variant: Variant;
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

export function GymCard({
  gym,
  tier,
  freshSectionIds,
  label,
  lastVisited,
  mostRecentFreshISO,
  variant,
  visitedDates,
  onChangeVisits,
}: Props) {
  const isCountMode = gym.freshness_mode === "count";
  const sectionsByOrder = [...gym.sections].sort((a, b) => a.display_order - b.display_order);
  const sectionsByRecent = [...gym.sections].sort((a, b) => {
    const aLatest = a.resets[0]?.reset_on ?? "";
    const bLatest = b.resets[0]?.reset_on ?? "";
    if (aLatest === bLatest) return a.display_order - b.display_order;
    return bLatest.localeCompare(aLatest);
  });
  const recent = mostRecentReset(sectionsByOrder);
  const allResets = isCountMode
    ? gym.sections.flatMap((s) => s.resets).sort((a, b) => b.reset_on.localeCompare(a.reset_on))
    : [];

  const isHero = variant === "hero";

  const surfaceStyle = tierCardStyle(tier);

  const hasDetails = recent !== null && sectionsByOrder.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = `gym-details-${gym.id}`;

  return (
    <article
      style={surfaceStyle}
      className={cn(
        "group squircle-4xl relative flex flex-col rounded-3xl border-2 border-(--surface-stroke) bg-(--surface-tint) backdrop-blur-sm transition-all",
        "shadow-[0_2px_0_0_var(--surface-stroke),0_12px_32px_-12px_var(--surface-shadow)]",
        "p-4 sm:p-5",
      )}
    >
      <header className="flex relative items-start justify-between gap-4">
        <h2
          className={cn(
            "font-heading font-bold tracking-tight text-foreground text-balance max-w-[calc(100%-var(--badge-width))] min-w-0 flex-1",
            isHero ? "min-h-12 text-3xl sm:text-4xl" : "text-2xl",
          )}
        >
          {gym.name}
        </h2>
        <FreshnessBadge tier={tier} label={label} size={isHero ? "hero" : "compact"} bob={isHero} />
      </header>

      {hasDetails ? (
        <>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={detailsId}
            className="mt-1 w-full text-left text-sm text-muted-foreground outline-none! cursor-pointer hover:text-foreground/80 transition-colors"
          >
            <span>{describeFreshness(label, lastVisited, mostRecentFreshISO)}</span>
            <span
              className={cn(
                "inline-flex items-center relative justify-center size-4 ml-1 rounded-full align-text-bottom transition-colors",
                isOpen ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />
            </span>
          </button>
          <div
            id={detailsId}
            className={cn(
              "[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-300 ease-out",
              isOpen ? "h-auto" : "h-0",
            )}
          >
            <div className="pt-3">
              {isCountMode ? (
                <GymResetTable mode="count" resets={allResets} lastVisited={lastVisited} />
              ) : (
                <GymResetTable
                  mode="sections"
                  sections={sectionsByRecent}
                  freshSectionIds={freshSectionIds}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {describeFreshness(label, lastVisited, mostRecentFreshISO)}
        </p>
      )}

      <footer className="flex flex-wrap mt-auto pt-4 items-center justify-between gap-3">
        <GymExternalLinks gym={gym} />
        <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
      </footer>
    </article>
  );
}
