"use client";

import { useActionState, useState } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions/admin/submissions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminSection } from "@/lib/db/admin";

type Props = {
  submissionId: string;
  // Passed only when the submission arrived without a sector — the gym's
  // sections, so the admin resolves it here before it reaches `resets`.
  sections?: AdminSection[];
};

export function ReviewActions({ submissionId, sections }: Props) {
  const [approveState, approveAction, isApproving] = useActionState(approveSubmission, null);
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectSubmission, null);
  const [sectionId, setSectionId] = useState("");
  const errorState = approveState && "error" in approveState ? approveState : rejectState;

  const needsSection = Boolean(sections?.length);

  return (
    <div className="flex flex-col gap-2">
      <FormAlert state={errorState} />
      <div className="flex flex-wrap items-end gap-2">
        <form action={approveAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="submission_id" value={submissionId} />
          {needsSection && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`section-${submissionId}`} className="text-xs">
                Sector to log it on
              </Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger id={`section-${submissionId}`} size="sm" className="w-44">
                  <SelectValue placeholder="Pick a sector…" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="section_id" value={sectionId} />
            </div>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isApproving || isRejecting || (needsSection && !sectionId)}
          >
            {isApproving ? "Approving…" : "Approve"}
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="submission_id" value={submissionId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={isApproving || isRejecting}
          >
            {isRejecting ? "Rejecting…" : "Reject"}
          </Button>
        </form>
      </div>
    </div>
  );
}
