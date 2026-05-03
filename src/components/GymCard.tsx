"use client";

import type { CSSProperties } from "react";
import {
  AtSignIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeIcon,
  NavigationIcon,
} from "lucide-react";
import type { GymWithSections } from "@/lib/types";
import { mostRecentReset, relativeDay } from "@/lib/freshness";
import { Button } from "@/components/ui/button";
import { VisitedButton } from "@/components/VisitedButton";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { SubmitResetDialog } from "@/components/SubmitResetDialog";
import { percentToTier, type TierKey } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact";

type Props = {
  gym: GymWithSections;
  percent: number | null;
  freshSectionIds: Set<string>;
  variant: Variant;
  expanded: boolean;
  visitedDates: string[];
  authed: boolean;
  onToggle: () => void;
  onChangeVisits: (isoDates: string[]) => void;
};

const cardSurface: Record<TierKey, CSSProperties> = {
  hot: {
    "--badge-width": "120px",
    "--surface-tint": "oklch(0.97 0.04 30 / 0.7)",
    "--surface-stroke": "oklch(0.86 0.07 30)",
    "--surface-shadow": "oklch(0.55 0.20 30 / 0.18)",
  } as CSSProperties,
  worth: {
    "--badge-width": "90px",
    "--surface-tint": "oklch(0.97 0.07 92 / 0.7)",
    "--surface-stroke": "oklch(0.88 0.09 85)",
    "--surface-shadow": "oklch(0.62 0.16 80 / 0.18)",
  } as CSSProperties,
  slim: {
    "--badge-width": "90px",
    "--surface-tint": "oklch(0.97 0.04 165 / 0.7)",
    "--surface-stroke": "oklch(0.87 0.06 165)",
    "--surface-shadow": "oklch(0.58 0.13 165 / 0.16)",
  } as CSSProperties,
  stale: {
    "--badge-width": "90px",
    "--surface-tint": "oklch(0.96 0.015 285 / 0.7)",
    "--surface-stroke": "oklch(0.86 0.03 285)",
    "--surface-shadow": "oklch(0.65 0.05 285 / 0.14)",
  } as CSSProperties,
  unknown: {
    "--badge-width": "90px",
    "--surface-tint": "oklch(1 0 0 / 0.7)",
    "--surface-stroke": "oklch(0.86 0 0)",
    "--surface-shadow": "oklch(0.55 0 0 / 0.10)",
  } as CSSProperties,
};

const chipStyles: Record<"fresh" | "stale" | "none", string> = {
  fresh: "border border-foreground/50 bg-background/30 text-foreground",
  stale: "border border-foreground/20 bg-transparent text-muted-foreground/70",
  none: "border border-dashed border-foreground/15 bg-transparent text-muted-foreground/70",
};

export function GymCard({
  gym,
  percent,
  freshSectionIds,
  variant,
  expanded,
  visitedDates,
  authed,
  onToggle,
  onChangeVisits,
}: Props) {
  const sectionsByOrder = [...gym.sections].sort((a, b) => a.display_order - b.display_order);
  const sectionsByRecent = [...gym.sections].sort((a, b) => {
    const aLatest = a.resets[0]?.reset_on ?? "";
    const bLatest = b.resets[0]?.reset_on ?? "";
    if (aLatest === bLatest) return a.display_order - b.display_order;
    return bLatest.localeCompare(aLatest);
  });
  const recent = mostRecentReset(sectionsByOrder);
  const tier = percentToTier(percent);

  const instagramUrl = gym.instagram_handle
    ? `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`
    : null;
  const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [gym.name, gym.neighborhood, "Bratislava"].filter(Boolean).join(" "),
  )}`;

  const detailsId = `gym-details-${gym.id}`;
  const isHero = variant === "hero";

  const surfaceStyle = cardSurface[tier.key];

  const renderSection = (section: (typeof gym.sections)[number]) => {
    const sectionMostRecent = section.resets[0];
    const state: "fresh" | "stale" | "none" = !sectionMostRecent
      ? "none"
      : freshSectionIds.has(section.id)
        ? "fresh"
        : "stale";
    return (
      <div
        key={section.id}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-medium",
          chipStyles[state],
        )}
      >
        <span className="font-semibold">{section.name}</span>
        <span className="opacity-70 font-mono tabular-nums text-[10px]">
          {sectionMostRecent ? relativeDay(sectionMostRecent.reset_on) : "—"}
        </span>
      </div>
    );
  };

  return (
    <article
      style={surfaceStyle}
      className={cn(
        "group relative flex flex-col rounded-3xl border-2 border-(--surface-stroke) bg-(--surface-tint) backdrop-blur-sm transition-all",
        "shadow-[0_2px_0_0_var(--surface-stroke),0_12px_32px_-12px_var(--surface-shadow)]",
        "p-4 sm:p-5",
      )}
    >
      {isHero && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
          today&rsquo;s pick
        </span>
      )}

      <header className="flex relative items-start justify-between gap-4">
        <div className="min-w-0 flex-1 w-full">
          <h2
            className={cn(
              "font-extrabold tracking-tight text-foreground text-balance leading-[1.05] max-w-[calc(100%-var(--badge-width))]",
              isHero ? "text-3xl sm:text-4xl" : "text-xl",
            )}
          >
            {gym.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{`${freshSectionIds.size} out of ${sectionsByOrder.length} sectors are fresh since your last visit.`}</p>
        </div>
        <FreshnessBadge percent={percent} size={isHero ? "hero" : "compact"} bob={isHero} />
      </header>

      {recent && sectionsByOrder.length > 0 && (
        <>
          {/* {isHero ? (
            <div className="flex flex-wrap gap-1.5">{sectionsByRecent.map(renderSection)}</div>
          ) : ( */}
          <div className="overflow-hidden mt-2">
            {!isHero && (
              <button
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={detailsId}
                className="flex items-center gap-1 cursor-pointer text-muted-foreground text-sm"
              >
                Show details
                <ChevronDownIcon
                  className={cn(
                    "size-3 transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            )}
            <div
              id={detailsId}
              className={cn(
                "[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-300 ease-out",
                expanded ? "h-auto" : "h-0",
              )}
            >
              <div className="flex flex-wrap gap-1 pt-1">{sectionsByRecent.map(renderSection)}</div>
            </div>
          </div>
          {/* )} */}
        </>
      )}

      <footer className="flex mt-4 items-center justify-between gap-3 pt-1">
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
        <div className="flex items-center gap-2">
          <SubmitResetDialog gym={gym} authed={authed} />
          <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
        </div>
      </footer>
    </article>
  );
}
