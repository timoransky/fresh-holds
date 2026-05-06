"use client";

import { useState, type CSSProperties } from "react";
import { AtSignIcon, CircleHelpIcon, GlobeIcon, NavigationIcon } from "lucide-react";
import type { GymWithSections } from "@/lib/types";
import { describeFreshness, mostRecentReset, relativeDay, type FreshLabel } from "@/lib/freshness";
import { Button } from "@/components/ui/button";
import { VisitedButton } from "@/components/VisitedButton";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { SubmitResetDialog } from "@/components/SubmitResetDialog";
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
  authed: boolean;
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

function StatusDot({ state }: { state: "fresh" | "stale" | "none" }) {
  if (state === "fresh") {
    return (
      <span
        aria-label="fresh since your last visit"
        className="inline-block size-1.5 rounded-full bg-emerald-500"
      />
    );
  }
  if (state === "stale") {
    return (
      <span
        aria-label="already climbed"
        className="inline-block size-1.5 rounded-full border border-muted-foreground/50"
      />
    );
  }
  return (
    <span
      aria-label="no reset data"
      className="inline-block size-1 rounded-full bg-muted-foreground/30"
    />
  );
}

export function GymCard({
  gym,
  tier,
  freshSectionIds,
  label,
  lastVisited,
  variant,
  visitedDates,
  authed,
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
            "font-extrabold tracking-tight text-foreground text-balance leading-[1.05] max-w-[calc(100%-var(--badge-width))] min-w-0 flex-1",
            isHero ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
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
            className="mt-2 inline-flex items-center w-full text-left text-sm text-muted-foreground cursor-pointer hover:text-foreground/80 transition-colors"
          >
            {describeFreshness(label, lastVisited)}
            <CircleHelpIcon
              className={cn(
                "inline-block size-3.5 ml-1 align-text-bottom transition-colors opacity-80",
                isOpen
                  ? "[&>circle]:fill-foreground [&>circle]:stroke-foreground [&>path]:stroke-background"
                  : "",
              )}
            />
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
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      <th className="text-left font-medium pb-1.5">Date</th>
                      <th className="text-left font-medium pb-1.5">Boulders</th>
                      <th className="w-4 pb-1.5" aria-label="status" />
                    </tr>
                  </thead>
                  <tbody>
                    {allResets.map((reset) => {
                      const isFresh = lastVisited === null || reset.reset_on > lastVisited;
                      const state: "fresh" | "stale" = isFresh ? "fresh" : "stale";
                      return (
                        <tr key={reset.id} className="border-t border-foreground/10">
                          <td className="py-1.5 font-medium text-foreground/90">
                            {relativeDay(reset.reset_on)}
                          </td>
                          <td className="py-1.5 text-muted-foreground">
                            {reset.boulders_reset ?? 0}
                          </td>
                          <td className="py-1.5 align-middle">
                            <StatusDot state={state} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      <th className="text-left font-medium pb-1.5">Sector</th>
                      <th className="text-left font-medium pb-1.5">Last reset</th>
                      <th className="w-4 pb-1.5" aria-label="status" />
                    </tr>
                  </thead>
                  <tbody>
                    {sectionsByRecent.map((section) => {
                      const sectionMostRecent = section.resets[0];
                      const state: "fresh" | "stale" | "none" = !sectionMostRecent
                        ? "none"
                        : freshSectionIds.has(section.id)
                          ? "fresh"
                          : "stale";
                      return (
                        <tr key={section.id} className="border-t border-foreground/10">
                          <td className="py-1.5 font-medium text-foreground/90">{section.name}</td>
                          <td className="py-1.5 text-muted-foreground">
                            {sectionMostRecent ? relativeDay(sectionMostRecent.reset_on) : "—"}
                          </td>
                          <td className="py-1.5 align-middle">
                            <StatusDot state={state} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {describeFreshness(label, lastVisited)}
        </p>
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
        <div className="flex items-center gap-2">
          <SubmitResetDialog gym={gym} authed={authed} />
          <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
        </div>
      </footer>
    </article>
  );
}
