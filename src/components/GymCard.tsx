"use client";

import { AtSignIcon, ChevronDownIcon, GlobeIcon, NavigationIcon } from "lucide-react";
import type { GymWithSections } from "@/lib/types";
import { mostRecentReset, relativeDay } from "@/lib/freshness";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VisitedButton } from "@/components/VisitedButton";

type Props = {
  gym: GymWithSections;
  percent: number | null;
  freshSectionIds: Set<string>;
  isFreshestPick: boolean;
  lastVisited: string | null;
  expanded: boolean;
  visitedDates: string[];
  onToggle: () => void;
  onChangeVisits: (isoDates: string[]) => void;
};

export function GymCard({
  gym,
  percent,
  freshSectionIds,
  isFreshestPick,
  lastVisited,
  expanded,
  visitedDates,
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
  const allSameFreshness =
    freshSectionIds.size === 0 || freshSectionIds.size === sectionsByOrder.length;

  const instagramUrl = gym.instagram_handle
    ? `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`
    : null;
  const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [gym.name, gym.neighborhood, "Bratislava"].filter(Boolean).join(" "),
  )}`;

  const detailsId = `gym-details-${gym.id}`;
  const hasMoreSections = recent !== null && sectionsByRecent.length > 1;

  const renderSection = (section: (typeof gym.sections)[number]) => {
    const sectionMostRecent = section.resets[0];
    const isFresh = freshSectionIds.has(section.id);
    return (
      <li key={section.id} className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-800">{section.name}</span>
        <span className="flex items-center gap-2 text-neutral-500 text-xs">
          <span>
            {sectionMostRecent ? relativeDay(sectionMostRecent.reset_on) : "no recent reset"}
          </span>
          {!allSameFreshness && (
            <span
              className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                isFresh ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {isFresh ? "fresh" : "stale"}
            </span>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="p-0 gap-0 isolate">
      <Card className="gap-4 p-4 sm:p-5 py-4 sm:py-5 rounded-b-xl bg-background overflow-hidden relative z-20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-neutral-900 truncate">{gym.name}</h2>
            </div>
          </div>
          <div className="text-right shrink-0">
            {percent === null ? (
              <>
                <div className="text-3xl font-semibold text-neutral-400 leading-none">—</div>
                <div className="text-[11px] text-neutral-400 mt-1">no reset data</div>
              </>
            ) : (
              <>
                <div
                  className={`text-3xl font-semibold leading-none ${
                    percent > 0 ? "text-emerald-600" : "text-neutral-400"
                  }`}
                >
                  {percent}%
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">of the gym is fresh for you</div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 ">
          <div className="flex gap-2 min-w-0">
            <Button asChild variant="secondary" size="icon-sm">
              <a
                href={navigateUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in Google Maps"
              >
                <NavigationIcon />
              </a>
            </Button>
            {gym.website_url && (
              <Button asChild variant="secondary" size="icon-sm">
                <a
                  href={gym.website_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open website"
                >
                  <GlobeIcon />
                </a>
              </Button>
            )}
            {instagramUrl && (
              <Button asChild variant="secondary" size="icon-sm">
                <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Open Instagram">
                  <AtSignIcon />
                </a>
              </Button>
            )}
          </div>
          <VisitedButton visitedDates={visitedDates} onChangeVisits={onChangeVisits} />
        </div>
      </Card>

      {recent && sectionsByRecent.length > 0 && (
        <div className="px-5">
          <Card className="gap-0 pt-4 -top-4 bg-neutral-100 px-4 sm:px-5 pb-0 relative z-10 rounded-t-none">
            {hasMoreSections && (
              <div className="relative ">
                <div
                  id={detailsId}
                  className={`[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-300 ease-out ${
                    expanded ? "h-auto" : "h-0"
                  }`}
                >
                  <ul className={`space-y-1 pt-4`}>{sectionsByRecent.map(renderSection)}</ul>
                </div>
              </div>
            )}

            <Button
              variant="link"
              onClick={onToggle}
              className={`flex w-full z-10 items-center justify-center gap-1 text-xs text-neutral-500 ${
                expanded ? "" : ""
              }`}
            >
              {expanded
                ? "hide all sectors"
                : `${freshSectionIds.size} of ${sectionsByOrder.length} sectors are fresh`}
              <ChevronDownIcon
                className={`size-3.5 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
