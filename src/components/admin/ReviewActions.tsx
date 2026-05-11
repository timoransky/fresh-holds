"use client";

import { useActionState } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions/admin/submissions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

type Props = {
  submissionId: string;
};

export function ReviewActions({ submissionId }: Props) {
  const [approveState, approveAction, isApproving] = useActionState(approveSubmission, null);
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectSubmission, null);
  const errorState = approveState && "error" in approveState ? approveState : rejectState;

  return (
    <div className="flex flex-col gap-2">
      <FormAlert state={errorState} />
      <div className="flex gap-2">
        <form action={approveAction}>
          <input type="hidden" name="submission_id" value={submissionId} />
          <Button type="submit" size="sm" disabled={isApproving || isRejecting}>
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
