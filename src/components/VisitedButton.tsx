"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { relativeDay } from "@/lib/freshness";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const today = todayISO();
  const yesterday = yesterdayISO();

  const latestVisit = useMemo(() => {
    if (visitedDates.length === 0) return null;
    return visitedDates.reduce((max, d) => (d > max ? d : max));
  }, [visitedDates]);

  const hasVisits = latestVisit !== null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setPendingDates(visitedDates);
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    onChangeVisits(pendingDates);
    setOpen(false);
  };

  const togglePreset = (iso: string) => {
    setPendingDates((prev) => (prev.length === 1 && prev[0] === iso ? [] : [iso]));
  };

  const selectedDates = useMemo(() => pendingDates.map(dateFromISO), [pendingDates]);
  const pendingToday = pendingDates.includes(today);
  const pendingYesterday = pendingDates.includes(yesterday);

  const defaultMonth = useMemo(() => {
    if (!isDesktop) return undefined;
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [isDesktop]);

  const trigger = (
    <Button type="button" size="sm" variant="default" className="rounded-full">
      {/* {hasVisits ? (
        <>
          <CheckIcon className="size-3.5" />
          <span>climbed {relativeDay(latestVisit)}</span>
        </>
      ) : ( */}
      <>
        <PlusIcon className="size-3.5" />
        <span>track my visit</span>
      </>
      {/* )} */}
    </Button>
  );

  const header = (
    <div className="px-4 pt-4 pb-2">
      <p className="text-center text-lg font-semibold">when did you climb?</p>
    </div>
  );

  const presets = (
    <div className="flex justify-center gap-1.5 px-4 pb-4 pt-2">
      <button
        type="button"
        onClick={() => togglePreset(today)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
          pendingToday
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-transparent text-foreground hover:bg-muted",
        )}
      >
        today
      </button>
      <button
        type="button"
        onClick={() => togglePreset(yesterday)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
          pendingYesterday
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-transparent text-foreground hover:bg-muted",
        )}
      >
        yesterday
      </button>
    </div>
  );

  const pickerContent = (
    <div onClick={(e) => e.stopPropagation()}>
      {header}
      <div className="flex justify-center border-t p-4">
        <Calendar
          mode="multiple"
          numberOfMonths={isDesktop ? 2 : 1}
          defaultMonth={defaultMonth}
          fixedWeeks
          selected={selectedDates}
          onSelect={(dates) => setPendingDates((dates ?? []).map(isoFromDate))}
          disabled={{ after: new Date() }}
          autoFocus
          className="p-0 [--cell-size:--spacing(9.5)]"
        />
      </div>
      {/* {presets} */}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-auto min-w-sm p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Log a visit</DialogTitle>
          </DialogHeader>
          {pickerContent}
          <div className="p-3 border-t flex items-center justify-center">
            <Button onClick={handleConfirm} className="w-full max-w-3xs mx-auto">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Log a visit</DrawerTitle>
        </DrawerHeader>
        {pickerContent}
        <DrawerFooter>
          <Button onClick={handleConfirm}>Done</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
