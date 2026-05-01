"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { relativeDay } from "@/lib/freshness";
import { cn } from "@/lib/utils";

type Props = {
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayISO(): string {
  return isoFromDate(new Date());
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoFromDate(d);
}

export function VisitedButton({ visitedDates, onChangeVisits }: Props) {
  const [open, setOpen] = useState(false);

  const today = todayISO();
  const yesterday = yesterdayISO();
  const visitedToday = visitedDates.includes(today);
  const visitedYesterday = visitedDates.includes(yesterday);

  const latestVisit = useMemo(() => {
    if (visitedDates.length === 0) return null;
    return visitedDates.reduce((max, d) => (d > max ? d : max));
  }, [visitedDates]);

  const selectedDates = useMemo(() => visitedDates.map(dateFromISO), [visitedDates]);

  const handleSelect = (dates: Date[] | undefined) => {
    onChangeVisits((dates ?? []).map(isoFromDate));
    setOpen(false);
  };

  const togglePreset = (iso: string) => {
    const next = visitedDates.includes(iso)
      ? visitedDates.filter((d) => d !== iso)
      : [...visitedDates, iso];
    onChangeVisits(next);
    setOpen(false);
  };

  const hasVisits = latestVisit !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-full font-semibold transition-colors",
            hasVisits
              ? "border-[oklch(0.78_0.10_165)] bg-[oklch(0.95_0.06_165)] text-[oklch(0.32_0.10_165)] hover:bg-[oklch(0.92_0.08_165)]"
              : "border-foreground/15",
          )}
        >
          {hasVisits ? (
            <>
              <CheckIcon className="size-3.5" />
              <span>climbed {relativeDay(latestVisit)}</span>
            </>
          ) : (
            <>
              <PlusIcon className="size-3.5" />
              <span>i climbed here</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 overflow-hidden"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex flex-wrap gap-3 border-b bg-muted/50 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 shadow-none"
              onClick={() => togglePreset(today)}
            >
              today {visitedToday && <CheckIcon className="size-3" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 shadow-none"
              onClick={() => togglePreset(yesterday)}
            >
              yesterday {visitedYesterday && <CheckIcon className="size-3" />}
            </Button>
          </div>
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={handleSelect}
            disabled={{ after: new Date() }}
            autoFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
