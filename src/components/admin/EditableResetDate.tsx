"use client";

import { useActionState, useState } from "react";
import { updateResetDate } from "@/lib/actions/admin/resets";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/date";

type Props = {
  resetId: string;
  resetOn: string;
};

export function EditableResetDate({ resetId, resetOn }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateResetDate, null);

  // Collapse the editor once a save succeeds (mirrors ResetForm's reset trick).
  const wasSuccess = state !== null && "success" in state;
  const [prevSuccess, setPrevSuccess] = useState(wasSuccess);
  if (wasSuccess !== prevSuccess) {
    setPrevSuccess(wasSuccess);
    if (wasSuccess) setEditing(false);
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        Reset at: {resetOn}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          edit
        </button>
      </span>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input type="hidden" name="reset_id" value={resetId} />
        <Input
          type="date"
          name="reset_on"
          defaultValue={resetOn}
          max={todayISO()}
          className="h-8 w-auto"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
      </div>
      {state && "error" in state && <FormAlert state={state} />}
    </form>
  );
}
