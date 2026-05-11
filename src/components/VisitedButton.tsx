"use client";

import { useMemo, useState } from "react";
import { CalendarPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Calendar } from "@/components/ui/calendar";
import { dateFromISO, isoFromDate } from "@/lib/date";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type Props = {
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

export function VisitedButton({ visitedDates, onChangeVisits }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setPendingDates(visitedDates);
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    onChangeVisits(pendingDates);
    setOpen(false);
  };

  const selectedDates = useMemo(() => pendingDates.map(dateFromISO), [pendingDates]);

  const defaultMonth = useMemo(() => {
    if (!isDesktop) return undefined;
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [isDesktop]);

  const trigger = (
    <Button type="button" size="sm" className="rounded-full">
      <CalendarPlusIcon className="size-3.5" />
      <span>log my visit</span>
    </Button>
  );

  const header = (
    <div className="px-4 pt-4 pb-2">
      <p className="text-center text-lg font-semibold">when did you climb?</p>
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
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent desktopClassName="w-auto min-w-sm p-0">
        <ResponsiveDialogHeader srOnly>
          <ResponsiveDialogTitle>Log a visit</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {isDesktop ? (
          <>
            {pickerContent}
            <div className="p-3 border-t flex items-center justify-center">
              <Button onClick={handleConfirm} className="w-full max-w-3xs mx-auto">
                Done
              </Button>
            </div>
          </>
        ) : (
          <div className="px-6 pt-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 font-heading text-3xl text-center font-extrabold tracking-tight">
              when did you climb?
            </h2>
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                numberOfMonths={1}
                defaultMonth={defaultMonth}
                fixedWeeks
                selected={selectedDates}
                onSelect={(dates) => setPendingDates((dates ?? []).map(isoFromDate))}
                disabled={{ after: new Date() }}
                autoFocus
                className="p-0 [--cell-size:--spacing(9.5)]"
              />
            </div>
            <Button onClick={handleConfirm} className="mt-6 w-full">
              Done
            </Button>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
