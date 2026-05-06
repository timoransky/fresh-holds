"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { suggestReset } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GymWithSections } from "@/lib/types";

type Props = {
  gyms: GymWithSections[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SuggestResetForm({ gyms, open, onOpenChange }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, formAction, isPending] = useActionState(suggestReset, null);
  const [selectedGymId, setSelectedGymId] = useState("");
  const today = new Date().toISOString().slice(0, 10);

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

  const error = state && "error" in state ? state.error : null;
  const success = state && "success" in state && state.success;

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        onOpenChange(false);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [success, onOpenChange]);

  useEffect(() => {
    if (open) setSelectedGymId("");
  }, [open]);

  const formBody = (
    <form action={formAction} className="flex flex-col gap-4 px-4 pb-4 pt-2">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-600/20 bg-green-50 px-4 py-3 text-sm text-green-700">
          Thanks — your suggestion is in the review queue.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="suggest_gym_id" className="text-sm font-medium">
          Gym
        </label>
        <select
          id="suggest_gym_id"
          name="gym_id"
          value={selectedGymId}
          onChange={(e) => setSelectedGymId(e.target.value)}
          required
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="" disabled>
            Select a gym…
          </option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="suggest_section_id" className="text-sm font-medium">
          Sector
        </label>
        <select
          id="suggest_section_id"
          name="section_id"
          required
          disabled={!selectedGym}
          defaultValue=""
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
        >
          <option value="" disabled>
            {selectedGym ? "Select a sector…" : "Pick a gym first"}
          </option>
          {sortedSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="suggest_reset_on" className="text-sm font-medium">
          Reset date
        </label>
        <input
          id="suggest_reset_on"
          name="reset_on"
          type="date"
          required
          max={today}
          defaultValue={today}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="suggest_notes" className="text-sm font-medium">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="suggest_notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="e.g. Whole sector restripped, ~25 new problems"
          className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-2 rounded-md border border-dashed border-foreground/15 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ImageIcon className="size-3.5" />
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
        <Button type="submit" size="sm" disabled={isPending || !!success}>
          {isPending ? "Sending…" : "Send suggestion"}
        </Button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(92vw,460px)] p-0">
          <DialogHeader className="px-4 pb-2 pt-4">
            <DialogTitle>Suggest a reset</DialogTitle>
            <DialogDescription>
              Spotted fresh climbing? An admin will review and merge it into the public
              freshness data.
            </DialogDescription>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Suggest a reset</DrawerTitle>
          <DrawerDescription>
            Spotted fresh climbing? An admin will review and merge it into the public
            freshness data.
          </DrawerDescription>
        </DrawerHeader>
        {formBody}
      </DrawerContent>
    </Drawer>
  );
}
