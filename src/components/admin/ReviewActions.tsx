"use client";

import { useActionState } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";

type Props = {
  submissionId: string;
};

export function ReviewActions({ submissionId }: Props) {
  const [approveState, approveAction, isApproving] = useActionState(approveSubmission, null);
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectSubmission, null);
  const error = approveState?.error ?? rejectState?.error ?? null;

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
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
