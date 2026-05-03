"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { suggestReset } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GymWithSections } from "@/lib/types";

type Props = {
  gym: GymWithSections;
  authed: boolean;
};

export function SubmitResetDialog({ gym, authed }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(suggestReset, null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  const sortedSections = [...gym.sections].sort((a, b) => a.display_order - b.display_order);
  const error = state && "error" in state ? state.error : null;
  const success = state && "success" in state && state.success;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="rounded-full gap-1">
          <SparklesIcon className="size-3" />
          Suggest reset
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,420px)] p-6">
        <DialogHeader>
          <DialogTitle>Suggest a reset for {gym.name}</DialogTitle>
          <DialogDescription>
            Spotted fresh climbing? Tell us which sector got reset and when. An admin will
            review and merge it into the public freshness data.
          </DialogDescription>
        </DialogHeader>

        {!authed ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-foreground/15 bg-background/60 p-4 text-sm">
            <p className="text-muted-foreground">Sign in to suggest a reset.</p>
            <Button asChild size="sm">
              <Link href={`/login?next=/`}>Sign in</Link>
            </Button>
          </div>
        ) : success ? (
          <div className="mt-4 rounded-lg border border-green-600/20 bg-green-50 px-4 py-3 text-sm text-green-700">
            Thanks — your suggestion is in the review queue.
          </div>
        ) : (
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="section_id" className="text-sm font-medium">
                Sector
              </label>
              <select
                id="section_id"
                name="section_id"
                required
                defaultValue=""
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="" disabled>
                  Select a sector…
                </option>
                {sortedSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset_on" className="text-sm font-medium">
                Reset date
              </label>
              <input
                id="reset_on"
                name="reset_on"
                type="date"
                required
                max={today}
                defaultValue={today}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={500}
                placeholder="e.g. Whole sector restripped, ~25 new problems"
                className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Sending…" : "Send suggestion"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
