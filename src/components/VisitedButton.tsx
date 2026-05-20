"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CalendarAdd01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Calendar } from "@/components/ui/calendar";
import { dateFromISO, isoFromDate } from "@/lib/date";

type Props = {
  visitedDates: string[];
  onChangeVisits: (isoDates: string[]) => void;
};

export function VisitedButton({ visitedDates, onChangeVisits }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingDates, setPendingDates] = useState<string[]>([]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setPendingDates(visitedDates);
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    onChangeVisits(pendingDates);
    setOpen(false);
  };

  const selectedDates = useMemo(() => pendingDates.map(dateFromISO), [pendingDates]);

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button type="button" size="sm" className="rounded-full">
          <HugeiconsIcon icon={CalendarAdd01Icon} strokeWidth={2} />
          <span>log my visit</span>
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent desktopClassName="w-[min(92vw,460px)] p-0">
        <ResponsiveDialogHeader desktopClassName="px-6 pb-2 pt-6" mobileClassName="px-6 pb-2 pt-4">
          <ResponsiveDialogTitle>Log a visit</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Tap each day you climbed. We use this to rank gyms by what&rsquo;s new since
            you were last there.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div
          className="flex flex-col gap-4 px-6 pb-8 pt-2 md:pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <Calendar
              mode="multiple"
              numberOfMonths={1}
              fixedWeeks
              selected={selectedDates}
              onSelect={(dates) => setPendingDates((dates ?? []).map(isoFromDate))}
              disabled={{ after: new Date() }}
              autoFocus
              className="p-0 [--cell-size:--spacing(9.5)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleConfirm}>
              Done
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
