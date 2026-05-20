"use client";

import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { dateFromISO, relativeDay } from "@/lib/date";
import { useVisitLog } from "@/lib/visit-log";
import { useVisitHistory } from "@/components/user/VisitHistoryContext";

const CONFIRM_TIMEOUT_MS = 4000;

type Props = {
  gymNames: Record<string, string>;
  authed: boolean;
};

type GymGroup = {
  slug: string;
  name: string;
  dates: string[];
};

function groupVisits(
  history: Record<string, string[]>,
  gymNames: Record<string, string>,
): GymGroup[] {
  const groups: GymGroup[] = [];
  for (const [slug, dates] of Object.entries(history)) {
    if (dates.length === 0) continue;
    groups.push({
      slug,
      name: gymNames[slug] ?? slug,
      dates: [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
    });
  }
  // Sort gyms by their most recent visit, newest group first.
  groups.sort((a, b) => (a.dates[0] < b.dates[0] ? 1 : a.dates[0] > b.dates[0] ? -1 : 0));
  return groups;
}

function formatLongDate(iso: string): string {
  return dateFromISO(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VisitHistoryDialog({ gymNames, authed }: Props) {
  const { open, setOpen } = useVisitHistory();
  const { history, setVisits } = useVisitLog(authed);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const groups = useMemo(() => groupVisits(history, gymNames), [history, gymNames]);

  // Reset the inline-confirm whenever the dialog closes.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setPendingKey(null);
  }

  // Auto-cancel a pending confirm after a few seconds of inaction.
  useEffect(() => {
    if (!pendingKey) return;
    const t = setTimeout(() => setPendingKey(null), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [pendingKey]);

  const handleDelete = (slug: string, date: string) => {
    const key = `${slug}|${date}`;
    if (pendingKey !== key) {
      setPendingKey(key);
      return;
    }
    const remaining = (history[slug] ?? []).filter((d) => d !== date);
    setVisits(slug, remaining);
    setPendingKey(null);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogContent desktopClassName="w-[min(92vw,460px)] p-0">
        <ResponsiveDialogHeader desktopClassName="px-4 pb-2 pt-4" mobileClassName="px-4 pb-2 pt-4">
          <ResponsiveDialogTitle>Visit history</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Review every visit you&rsquo;ve logged. Delete a row to correct a mis-tap — the
            home page ranking updates on your next reload.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-4 pb-5">
          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-foreground/20 p-5 text-sm text-muted-foreground">
              No visits logged yet. Tap <span className="font-medium text-foreground">log my visit</span>{" "}
              on a gym card after you climb.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {groups.map((group) => (
                <li key={group.slug}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.name}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
                    {group.dates.map((date) => {
                      const key = `${group.slug}|${date}`;
                      const isPending = pendingKey === key;
                      return (
                        <li
                          key={date}
                          className="flex items-center justify-between gap-3 py-2 pl-3 pr-1.5 text-sm"
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="font-medium text-foreground">
                              {formatLongDate(date)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {relativeDay(date)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant={isPending ? "destructive" : "ghost"}
                            size={isPending ? "default" : "icon"}
                            aria-label={
                              isPending
                                ? `Confirm delete visit on ${formatLongDate(date)}`
                                : `Delete visit on ${formatLongDate(date)}`
                            }
                            className="transition-colors duration-150 hover:translate-y-0"
                            onClick={() => handleDelete(group.slug, date)}
                          >
                            {isPending ? (
                              "Confirm delete"
                            ) : (
                              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
