"use client";

import { useActionState, useEffect, useState } from "react";
import { submitReset } from "@/lib/actions/resets";
import { Button } from "@/components/ui/button";
import type { AdminGym } from "@/lib/db/admin";

export function ResetForm({ gyms }: { gyms: AdminGym[] }) {
  const [selectedGymId, setSelectedGymId] = useState("");
  const [checkedSections, setCheckedSections] = useState<Set<string>>(new Set());
  const [state, formAction, isPending] = useActionState(submitReset, null);

  const selectedGym = gyms.find((g) => g.id === selectedGymId);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state?.success) {
      setCheckedSections(new Set());
    }
  }, [state?.success]);

  function handleGymChange(gymId: string) {
    setSelectedGymId(gymId);
    setCheckedSections(new Set());
  }

  function toggleSection(id: string, checked: boolean) {
    setCheckedSections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-green-600/20 bg-green-50 px-4 py-3 text-sm text-green-700">
          {state.success}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="gym_id" className="text-sm font-medium">
          Gym
        </label>
        <select
          id="gym_id"
          name="gym_id"
          value={selectedGymId}
          onChange={(e) => handleGymChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="">Select a gym…</option>
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {selectedGym && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Sections reset</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {selectedGym.sections.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted has-[:checked]:border-foreground/50 has-[:checked]:bg-secondary"
              >
                <input
                  type="checkbox"
                  name="section_ids"
                  value={section.id}
                  checked={checkedSections.has(section.id)}
                  onChange={(e) => toggleSection(section.id, e.target.checked)}
                  className="accent-foreground"
                />
                {section.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset_on" className="text-sm font-medium">
          Reset date
        </label>
        <input
          id="reset_on"
          name="reset_on"
          type="date"
          defaultValue={today}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. Full reset, 30 new problems"
          className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending || !selectedGymId || checkedSections.size === 0}
        className="w-full"
      >
        {isPending ? "Logging…" : "Log reset"}
      </Button>
    </form>
  );
}
