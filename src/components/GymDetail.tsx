"use client";

import type { GymWithSections } from "@/lib/types";
import { daysSince } from "@/lib/freshness";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisitedButton } from "@/components/VisitedButton";

type Props = {
  gym: GymWithSections;
  percent: number | null;
  freshSectionIds: Set<string>;
  visitedToday: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkVisited: (isoDate: string) => void;
};

export function GymDetail({
  gym,
  percent,
  freshSectionIds,
  visitedToday,
  open,
  onOpenChange,
  onMarkVisited,
}: Props) {
  const sections = [...gym.sections].sort((a, b) => {
    const aLatest = a.resets[0]?.reset_on ?? "";
    const bLatest = b.resets[0]?.reset_on ?? "";
    if (aLatest === bLatest) return a.display_order - b.display_order;
    return bLatest.localeCompare(aLatest);
  });

  const instagramUrl = gym.instagram_handle
    ? `https://instagram.com/${gym.instagram_handle.replace(/^@/, "")}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="inset-x-0 bottom-0 left-0 top-auto translate-x-0 translate-y-0 max-w-none w-full rounded-b-none rounded-t-xl max-h-[85vh] overflow-y-auto gap-4 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-xl"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {gym.name}
          </DialogTitle>
          {gym.neighborhood && (
            <DialogDescription className="text-neutral-500">
              {gym.neighborhood}
            </DialogDescription>
          )}
        </DialogHeader>

        {(gym.website_url || instagramUrl) && (
          <div className="flex gap-3 text-sm">
            {gym.website_url && (
              <a
                href={gym.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
              >
                Website
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
              >
                Instagram
              </a>
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-3">
          <div>
            {percent === null ? (
              <>
                <div className="text-4xl font-semibold text-neutral-400 leading-none">
                  —
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  never visited
                </div>
              </>
            ) : (
              <>
                <div
                  className={`text-4xl font-semibold leading-none ${
                    percent > 0 ? "text-emerald-600" : "text-neutral-400"
                  }`}
                >
                  {percent}%
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  fresh since your last visit
                </div>
              </>
            )}
          </div>
          <VisitedButton
            visitedToday={visitedToday}
            onMarkVisited={onMarkVisited}
          />
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-neutral-500">
            Sections
          </h3>
          <ul className="mt-2 space-y-1.5">
            {sections.map((section) => {
              const sectionMostRecent = section.resets[0];
              const days = sectionMostRecent
                ? daysSince(sectionMostRecent.reset_on)
                : null;
              const isFresh = freshSectionIds.has(section.id);
              return (
                <li
                  key={section.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-neutral-800">{section.name}</span>
                  <span className="flex items-center gap-2 text-neutral-500 text-xs">
                    <span>
                      {days === null
                        ? "no recent reset"
                        : days === 0
                          ? "reset today"
                          : days === 1
                            ? "1 day ago"
                            : `${days} days ago`}
                    </span>
                    <span
                      className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                        isFresh
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {isFresh ? "fresh" : "stale"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
