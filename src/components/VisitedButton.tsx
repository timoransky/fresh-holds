"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { relativeDay } from "@/lib/freshness";
import { ledgeButtonClass } from "@/lib/styles";
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
    setPendingDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso],
    );
  };

  const selectedDates = useMemo(() => pendingDates.map(dateFromISO), [pendingDates]);
  const pendingToday = pendingDates.includes(today);
  const pendingYesterday = pendingDates.includes(yesterday);

  const trigger = (
    <Button
      type="button"
      size="sm"
      className={cn(
        "rounded-full cursor-pointer font-semibold",
        "hover:-translate-y-0.5 active:translate-y-0.5",
        hasVisits
          ? cn(
              ledgeButtonClass,
              "bg-background text-foreground hover:bg-background",
            )
          : cn(
              "bg-foreground text-background border-transparent hover:bg-foreground",
              "shadow-[0_2px_0_0_oklch(0.08_0.02_270/0.5)]",
              "hover:shadow-[0_3px_0_0_oklch(0.08_0.02_270/0.5)]",
              "active:shadow-[0_1px_0_0_oklch(0.08_0.02_270/0.5)]",
            ),
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
  );

  const pickerContent = (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-3 border-b bg-muted/50 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 shadow-none"
          onClick={() => togglePreset(today)}
        >
          today {pendingToday && <CheckIcon className="size-3" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 shadow-none"
          onClick={() => togglePreset(yesterday)}
        >
          yesterday {pendingYesterday && <CheckIcon className="size-3" />}
        </Button>
      </div>
      <Calendar
        mode="multiple"
        selected={selectedDates}
        onSelect={(dates) => setPendingDates((dates ?? []).map(isoFromDate))}
        disabled={{ after: new Date() }}
        autoFocus
      />
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="w-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Log a visit</DialogTitle>
          </DialogHeader>
          {pickerContent}
          <div className="p-3 border-t">
            <Button onClick={handleConfirm} className="w-full">
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
