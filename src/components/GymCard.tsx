"use client";

import type { KeyboardEvent } from "react";
import type { GymWithSections } from "@/lib/types";
import { daysSince, mostRecentReset } from "@/lib/freshness";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VisitedButton } from "@/components/VisitedButton";

type Props = {
  gym: GymWithSections;
  percent: number | null;
  freshSectionIds: Set<string>;
  isFreshestPick: boolean;
  visitedToday: boolean;
  onOpen: () => void;
  onMarkVisited: (isoDate: string) => void;
};

export function GymCard({
  gym,
  percent,
  freshSectionIds,
  isFreshestPick,
  visitedToday,
  onOpen,
  onMarkVisited,
}: Props) {
  const sections = [...gym.sections].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const recent = mostRecentReset(sections);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="gap-0 p-4 sm:p-5 py-4 sm:py-5 cursor-pointer transition-colors hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-neutral-900 truncate">
              {gym.name}
            </h2>
            {isFreshestPick && (
              <Badge className="bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider">
                Freshest pick
              </Badge>
            )}
          </div>
          {gym.neighborhood && (
            <p className="text-sm text-neutral-500 mt-0.5">{gym.neighborhood}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {percent === null ? (
            <>
              <div className="text-3xl font-semibold text-neutral-400 leading-none">
                —
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                never visited
              </div>
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
              <div className="text-[11px] text-neutral-400 mt-1">fresh</div>
            </>
          )}
        </div>
      </div>

      <div className="flex w-full mt-4 gap-1">
        {sections.map((section) => {
          const isFresh = freshSectionIds.has(section.id);
          return (
            <span
              key={section.id}
              title={section.name}
              className={`flex-1 h-8 rounded-md text-[10px] truncate px-1 flex items-center justify-center font-medium ${
                isFresh
                  ? "bg-emerald-500 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {section.name}
            </span>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-3 gap-3">
        <p className="text-sm text-neutral-500 truncate">
          {recent
            ? `Last reset ${formatDaysAgo(recent.reset_on)} · ${recent.section_name}`
            : "No recent resets"}
        </p>
        <VisitedButton
          visitedToday={visitedToday}
          onMarkVisited={onMarkVisited}
        />
      </div>
    </Card>
  );
}

function formatDaysAgo(isoDate: string): string {
  const days = daysSince(isoDate);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
