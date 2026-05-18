"use client";

import { useActionState, useState } from "react";
import { submitReset } from "@/lib/actions/admin/resets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/date";
import type { AdminGym } from "@/lib/db/admin";

export function ResetForm({ gyms }: { gyms: AdminGym[] }) {
  const [selectedGymId, setSelectedGymId] = useState("");
  const [checkedSections, setCheckedSections] = useState<Set<string>>(new Set());
  const [gymWide, setGymWide] = useState(false);
  const [bouldersReset, setBouldersReset] = useState("");
  const [state, formAction, isPending] = useActionState(submitReset, null);

  const selectedGym = gyms.find((g) => g.id === selectedGymId);
  const today = todayISO();

  const wasSuccess = state !== null && "success" in state;
  const [prevSuccess, setPrevSuccess] = useState(wasSuccess);
  if (wasSuccess !== prevSuccess) {
    setPrevSuccess(wasSuccess);
    if (wasSuccess) {
      setCheckedSections(new Set());
      setGymWide(false);
      setBouldersReset("");
    }
  }

  function handleGymChange(gymId: string) {
    setSelectedGymId(gymId);
    setCheckedSections(new Set());
    setGymWide(false);
    setBouldersReset("");
  }

  function toggleSection(id: string, checked: boolean) {
    setCheckedSections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const canSubmit =
    Boolean(selectedGymId) && (checkedSections.size > 0 || gymWide);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormAlert state={state} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gym_id">Gym</Label>
        <Select value={selectedGymId} onValueChange={handleGymChange}>
          <SelectTrigger id="gym_id">
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

      {selectedGym && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">What was reset</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {selectedGym.sections.map((section) => {
              const checked = checkedSections.has(section.id);
              return (
                <Label
                  key={section.id}
                  className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[[data-state=checked]]:border-foreground/50 has-[[data-state=checked]]:bg-secondary"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggleSection(section.id, c === true)}
                  />
                  {checked && (
                    <input type="hidden" name="section_ids" value={section.id} />
                  )}
                  {section.name}
                </Label>
              );
            })}
            <Label className="cursor-pointer rounded-md border border-dashed border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[[data-state=checked]]:border-foreground/50 has-[[data-state=checked]]:bg-secondary col-span-2">
              <Checkbox
                checked={gymWide}
                onCheckedChange={(c) => setGymWide(c === true)}
                name="gym_wide"
              />
              <span className="italic">Across the gym (no specific sector)</span>
            </Label>
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="boulders_reset">
          Boulders reset <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="boulders_reset"
          name="boulders_reset"
          type="number"
          min={1}
          inputMode="numeric"
          value={bouldersReset}
          onChange={(e) => setBouldersReset(e.target.value)}
          placeholder="e.g. 17"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset_on">Reset date</Label>
        <Input id="reset_on" name="reset_on" type="date" defaultValue={today} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. 5B–7A, by @by_womo"
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={isPending || !canSubmit} className="w-full">
        {isPending ? "Logging…" : "Log reset"}
      </Button>
    </form>
  );
}
