"use client";

import { useState, type MouseEvent } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Props = {
  visitedToday: boolean;
  onMarkVisited: (isoDate: string) => void;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function VisitedButton({ visitedToday, onMarkVisited }: Props) {
  const [open, setOpen] = useState(false);

  const handleToday = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!visitedToday) onMarkVisited(todayISO());
  };

  const handlePick = (date: Date | undefined) => {
    if (!date) return;
    onMarkVisited(isoFromDate(date));
    setOpen(false);
  };

  return (
    <ButtonGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={visitedToday}
        onClick={handleToday}
        className={
          visitedToday
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-100"
            : ""
        }
      >
        {visitedToday ? "Visited today ✓" : "I went here today"}
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Pick a different visit date"
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar
            mode="single"
            onSelect={handlePick}
            disabled={{ after: new Date() }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
