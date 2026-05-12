import { Suspense } from "react";
import type { Metadata } from "next";
import { listPendingSubmissions } from "@/lib/db/submissions";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Submissions · Fresh Holds Admin",
};

export default function SubmissionsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Reset suggestions</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Approving copies the suggestion 1:1 into <code>resets</code>. Reject if anything looks off.
      </p>

      <Suspense fallback={<PendingFallback />}>
        <PendingSection />
      </Suspense>
    </main>
  );
}

async function PendingSection() {
  const pending = await listPendingSubmissions();

  if (pending.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-foreground/20 p-6 text-sm text-muted-foreground">
        No pending suggestions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.map((s) => (
        <Card key={s.id}>
          <CardContent>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">
                {s.gym_name} — {s.section_name}
              </span>
              <span className="tabular-nums text-xs text-muted-foreground">{s.reset_on}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Suggested by {s.submitter_email} on{" "}
              <span className="tabular-nums">{s.created_at.slice(0, 10)}</span>
            </div>
            {s.boulders_reset !== null && (
              <div className="mt-1 text-xs text-foreground">
                <span className="font-mono tabular-nums">{s.boulders_reset}</span> new boulders
              </div>
            )}
            {s.notes && (
              <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {s.notes}
              </div>
            )}
            <div className="mt-3">
              <ReviewActions submissionId={s.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PendingFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="h-32 rounded-xl bg-foreground/5" />
      <div className="h-32 rounded-xl bg-foreground/5" />
    </div>
  );
}
