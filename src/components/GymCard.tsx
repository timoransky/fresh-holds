"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import type { ScoredGym } from "@/lib/freshness";
import { VisitedButton } from "@/components/VisitedButton";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { GymExternalLinks } from "@/components/gym/GymExternalLinks";
import { GymResetTable } from "@/components/gym/GymResetTable";
import { GymRecentResetsList } from "@/components/gym/GymRecentResetsList";
import { tierCardStyle } from "@/lib/tierStyle";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact";

type Props = {
  scored: ScoredGym;
  variant: Variant;
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

export function GymCard({ scored, variant, visitedDates, onChangeVisits }: Props) {
  const { gym, tier, narrative, freshSectionIds } = scored;
  const isHero = variant === "hero";

  const surfaceStyle = tierCardStyle(tier);

  const hasDetails = scored.mostRecentResetISO !== null && scored.sectionsByDisplay.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = `gym-details-${gym.id}`;

  return (
    <article
      style={surfaceStyle}
      className={cn(
        "group sticker-surface squircle-4xl relative flex flex-col rounded-3xl bg-(--surface-tint) backdrop-blur-sm transition-all",
        "p-4 sm:p-5",
        isHero ? "min-h-44" : "min-h-40 sm:min-h-37",
      )}
    >
      <header className="flex relative items-start justify-between gap-4">
        <h2
          className={cn(
            "font-heading font-bold tracking-tight leading-tight text-foreground text-balance max-w-[calc(100%-var(--badge-width))] min-w-0 flex-1",
            isHero ? "min-h-12 text-3xl sm:text-4xl" : "text-2xl",
          )}
        >
          {gym.name}
        </h2>
        <FreshnessBadge tier={tier} seed={gym.slug} size={isHero ? "hero" : "compact"} />
      </header>

      {hasDetails ? (
        <>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={detailsId}
            className="mt-2 w-full text-left text-sm text-muted-foreground outline-none! cursor-pointer hover:text-foreground/80 transition-colors"
          >
            <span>{narrative}</span>
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
              {scored.isCompactSectors ? (
                <GymRecentResetsList
                  resets={scored.recentResets}
                  showSectorColumn={scored.sectionsByDisplay.length > 1}
                  isAnon={scored.lastVisited === null}
                />
              ) : (
                <GymResetTable
                  sections={scored.sectionsByRecent}
                  freshSectionIds={freshSectionIds}
                  isAnon={scored.lastVisited === null}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{narrative}</p>
      )}

      <footer className="flex flex-wrap mt-auto pt-4 items-center justify-between gap-3">
        <GymExternalLinks gym={gym} />
        <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
      </footer>
    </article>
  );
}
