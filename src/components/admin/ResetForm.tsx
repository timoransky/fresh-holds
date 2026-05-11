"use client";

import { useActionState, useEffect, useState } from "react";
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
  const [bouldersReset, setBouldersReset] = useState("");
  const [state, formAction, isPending] = useActionState(submitReset, null);

  const selectedGym = gyms.find((g) => g.id === selectedGymId);
  const isCountMode = selectedGym?.freshness_mode === "count";
  const today = todayISO();

  const wasSuccess = state !== null && "success" in state;
  useEffect(() => {
    if (wasSuccess) {
      setCheckedSections(new Set());
      setBouldersReset("");
    }
  }, [wasSuccess]);

  function handleGymChange(gymId: string) {
    setSelectedGymId(gymId);
    setCheckedSections(new Set());
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

  // Count-mode gyms have a single "whole gym" section; the form auto-attaches to it.
  const countModeSection = isCountMode ? selectedGym?.sections[0] : undefined;
  const canSubmit = isCountMode
    ? Boolean(countModeSection) && bouldersReset.trim() !== "" && Number(bouldersReset) > 0
    : Boolean(selectedGymId) && checkedSections.size > 0;

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
                {g.freshness_mode === "count" ? " (count mode)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="gym_id" value={selectedGymId} />
      </div>

      {selectedGym && !isCountMode && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Sections reset</legend>
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
          </div>
        </fieldset>
      )}

      {isCountMode && countModeSection && (
        <>
          <input type="hidden" name="section_ids" value={countModeSection.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="boulders_reset">Boulders reset</Label>
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
        </>
      )}

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
          placeholder="e.g. Full reset, 30 new problems"
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={isPending || !canSubmit} className="w-full">
        {isPending ? "Logging…" : "Log reset"}
      </Button>
    </form>
  );
}
