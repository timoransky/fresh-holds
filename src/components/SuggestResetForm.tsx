"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { suggestReset } from "@/lib/actions/submissions";
import { GYM_WIDE_VALUE } from "@/lib/actions/submissions-constants";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/date";
import type { GymWithSectionCatalog } from "@/lib/db/gyms";

type Props = {
  gyms: GymWithSectionCatalog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SuggestResetForm({ gyms, open, onOpenChange }: Props) {
  const [state, formAction, isPending] = useActionState(suggestReset, null);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const today = todayISO();

  const selectedGym = useMemo(
    () => gyms.find((g) => g.id === selectedGymId),
    [gyms, selectedGymId],
  );
  const sortedSections = useMemo(
    () =>
      selectedGym
        ? [...selectedGym.sections].sort((a, b) => a.display_order - b.display_order)
        : [],
    [selectedGym],
  );

  const isGymWide = selectedSectionId === GYM_WIDE_VALUE;
  const wasSuccess = state !== null && "success" in state;

  useEffect(() => {
    if (wasSuccess) {
      const t = setTimeout(() => {
        onOpenChange(false);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [wasSuccess, onOpenChange]);

  const handleGymChange = (id: string) => {
    setSelectedGymId(id);
    setSelectedSectionId("");
  };

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedGymId("");
      setSelectedSectionId("");
    }
  }

  const formBody = (
    <form action={formAction} className="flex flex-col gap-4 px-4 pb-4 pt-2">
      <FormAlert state={state} successMessage="Thanks — your suggestion is in the review queue." />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_gym_id">Gym</Label>
        <Select value={selectedGymId} onValueChange={handleGymChange}>
          <SelectTrigger id="suggest_gym_id">
            <SelectValue placeholder="Select a gym…" />
          </SelectTrigger>
          <SelectContent>
            {gyms.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="gym_id" value={selectedGymId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_section_id">Sector</Label>
        <Select
          value={selectedSectionId}
          onValueChange={setSelectedSectionId}
          disabled={!selectedGym}
        >
          <SelectTrigger id="suggest_section_id">
            <SelectValue placeholder={selectedGym ? "Select a sector…" : "Pick a gym first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GYM_WIDE_VALUE}>
              <span className="italic">Across the gym</span>
            </SelectItem>
            {sortedSections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="section_id" value={selectedSectionId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_reset_on">Reset date</Label>
        <Input
          id="suggest_reset_on"
          name="reset_on"
          type="date"
          required
          max={today}
          defaultValue={today}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_boulders_reset">
          New boulders <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="suggest_boulders_reset"
          name="boulders_reset"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder={isGymWide ? "e.g. 25 across the gym" : "e.g. 5 new in this sector"}
        />
        <p className="text-xs text-muted-foreground">
          Skip if the gym didn&rsquo;t say how many.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suggest_notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="suggest_notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="e.g. Whole sector restripped, ~25 new problems"
          className="resize-none"
        />
      </div>

      <div className="flex items-center gap-2 rounded-md border border-dashed border-foreground/15 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Image01Icon} className="size-3.5" />
        <span>Photo upload coming soon.</span>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || wasSuccess}>
          {isPending ? "Sending…" : "Send suggestion"}
        </Button>
      </div>
    </form>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="w-[min(92vw,460px)] p-0">
        <ResponsiveDialogHeader desktopClassName="px-4 pb-2 pt-4">
          <ResponsiveDialogTitle>Suggest a reset</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Spotted fresh climbing? An admin will review and merge it into the public
            freshness data.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {formBody}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
