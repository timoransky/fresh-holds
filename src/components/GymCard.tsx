"use client";

import type { CSSProperties } from "react";
import { AtSignIcon, GlobeIcon, NavigationIcon } from "lucide-react";
import type { GymWithSections, Reset } from "@/lib/types";
import { describeFreshness, mostRecentReset, relativeDay, type FreshLabel } from "@/lib/freshness";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VisitedButton } from "@/components/VisitedButton";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import type { Tier, TierKey } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact";

type Props = {
  gym: GymWithSections;
  tier: Tier;
  freshSectionIds: Set<string>;
  label: FreshLabel | null;
  lastVisited: string | null;
  variant: Variant;
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

const cardSurface: Record<TierKey, CSSProperties> = {
  hot: {
    "--badge-width": "140px",
    "--surface-tint": "oklch(0.97 0.04 30 / 0.7)",
    "--surface-stroke": "oklch(0.86 0.07 30)",
    "--surface-shadow": "oklch(0.55 0.20 30 / 0.18)",
  } as CSSProperties,
  worth: {
    "--badge-width": "110px",
    "--surface-tint": "oklch(0.97 0.07 92 / 0.7)",
    "--surface-stroke": "oklch(0.88 0.09 85)",
    "--surface-shadow": "oklch(0.62 0.16 80 / 0.18)",
  } as CSSProperties,
  slim: {
    "--badge-width": "110px",
    "--surface-tint": "oklch(0.97 0.04 165 / 0.7)",
    "--surface-stroke": "oklch(0.87 0.06 165)",
    "--surface-shadow": "oklch(0.58 0.13 165 / 0.16)",
  } as CSSProperties,
  stale: {
    "--badge-width": "110px",
    "--surface-tint": "oklch(0.96 0.015 285 / 0.7)",
    "--surface-stroke": "oklch(0.86 0.03 285)",
    "--surface-shadow": "oklch(0.65 0.05 285 / 0.14)",
  } as CSSProperties,
  unknown: {
    "--badge-width": "110px",
    "--surface-tint": "oklch(1 0 0 / 0.7)",
    "--surface-stroke": "oklch(0.86 0 0)",
    "--surface-shadow": "oklch(0.55 0 0 / 0.10)",
  } as CSSProperties,
};

const chipStyles: Record<"fresh" | "stale" | "none", string> = {
  fresh: "border-muted-foreground/90 text-muted-foreground/90",
  stale: " border-dashed border-muted-foreground/60 text-muted-foreground/60",
  none: " border-dotted border-muted-foreground/30 text-muted-foreground/30",
};

export function GymCard({
  gym,
  tier,
  freshSectionIds,
  label,
  lastVisited,
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

  const instagramUrl = gym.instagram_handle
    ? `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`
    : null;
  const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [gym.name, gym.neighborhood, "Bratislava"].filter(Boolean).join(" "),
  )}`;

  const isHero = variant === "hero";

  const surfaceStyle = cardSurface[tier.key];

  const chipBaseClass =
    "inline-flex items-baseline rounded-full px-2 py-1 border bg-transparent cursor-pointer transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  const popoverContentClass =
    "w-auto py-1 px-2 text-xs font-medium tracking-tight gap-0 rounded-md";

  const renderReset = (reset: Reset) => {
    const isFresh = lastVisited === null || reset.reset_on > lastVisited;
    const state: "fresh" | "stale" = isFresh ? "fresh" : "stale";
    const count = reset.boulders_reset ?? 0;
    return (
      <Popover key={reset.id}>
        <PopoverTrigger asChild>
          <button type="button" className={cn(chipBaseClass, chipStyles[state])}>
            <span className="font-medium text-xs">
              {count} new {count === 1 ? "boulder" : "boulders"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className={popoverContentClass}>
          {relativeDay(reset.reset_on)}
        </PopoverContent>
      </Popover>
    );
  };

  const renderSection = (section: (typeof gym.sections)[number]) => {
    const sectionMostRecent = section.resets[0];
    const state: "fresh" | "stale" | "none" = !sectionMostRecent
      ? "none"
      : freshSectionIds.has(section.id)
        ? "fresh"
        : "stale";
    return (
      <Popover key={section.id}>
        <PopoverTrigger asChild>
          <button type="button" className={cn(chipBaseClass, chipStyles[state])}>
            <span className="font-medium text-xs">{section.name}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className={popoverContentClass}>
          {sectionMostRecent ? relativeDay(sectionMostRecent.reset_on) : "no resets logged"}
        </PopoverContent>
      </Popover>
    );
  };

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
        <div className="min-w-0 flex-1 w-full">
          <h2
            className={cn(
              "font-extrabold tracking-tight text-foreground text-balance leading-[1.05] max-w-[calc(100%-var(--badge-width))]",
              isHero ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
            )}
          >
            {gym.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {describeFreshness(label, lastVisited)}
          </p>
        </div>
        <FreshnessBadge tier={tier} label={label} size={isHero ? "hero" : "compact"} bob={isHero} />
      </header>

      {recent && sectionsByOrder.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {isCountMode ? allResets.map(renderReset) : sectionsByRecent.map(renderSection)}
        </div>
      )}

      <footer className="flex flex-wrap mt-auto pt-4 items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon-sm" className="rounded-full">
            <a
              href={navigateUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${gym.name} in Google Maps`}
            >
              <NavigationIcon />
            </a>
          </Button>
          {gym.website_url && (
            <Button asChild variant="outline" size="icon-sm" className="rounded-full">
              <a
                href={gym.website_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${gym.name} website`}
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
                aria-label={`Open ${gym.name} on Instagram`}
              >
                <AtSignIcon />
              </a>
            </Button>
          )}
        </div>
        <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
      </footer>
    </article>
  );
}
