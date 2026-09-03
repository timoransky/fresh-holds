import { Suspense } from "react";
import type { Metadata } from "next";
import { listPendingSubmissions, type SubmissionConfidence } from "@/lib/db/submissions";
import { getGymsForAdmin } from "@/lib/db/admin";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// The Instagram-stories bot files every plausible read and lets the badge carry
// its certainty (ADR-0006), so "low" here means "worth a human's glance", not
// "probably wrong". Human suggestions carry no confidence.
const confidenceVariant: Record<SubmissionConfidence, "success" | "secondary" | "outline"> = {
  high: "success",
  medium: "secondary",
  low: "outline",
};

export const metadata: Metadata = {
  title: "Submissions · Fresh Holds Admin",
};

export default function SubmissionsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight">Reset suggestions</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Approving copies the suggestion 1:1 into <code>resets</code>. Reject if anything looks off.
        Scraped suggestions show how sure the bot was — check the photo on the low ones.
      </p>

      <Suspense fallback={<PendingFallback />}>
        <PendingSection />
      </Suspense>
    </main>
  );
}

async function PendingSection() {
  const [pending, gyms] = await Promise.all([listPendingSubmissions(), getGymsForAdmin()]);

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
                {s.gym_name}
                {s.section_name ? (
                  <> — {s.section_name}</>
                ) : (
                  <span className="font-normal text-muted-foreground"> — no sector given</span>
                )}
              </span>
              <div className="flex shrink-0 items-baseline gap-2">
                {s.confidence && (
                  <Badge
                    variant={confidenceVariant[s.confidence]}
                    className="uppercase tracking-wider text-[10px] font-semibold"
                  >
                    {s.confidence}
                  </Badge>
                )}
                <span className="tabular-nums text-xs text-muted-foreground">{s.reset_on}</span>
              </div>
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
            {s.photo_url && (
              <a
                href={s.photo_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block"
                title="Open photo in new tab"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photo_url}
                  alt="Submitted reset photo"
                  className="size-20 rounded-md border border-border object-cover transition hover:opacity-80"
                />
              </a>
            )}
            <div className="mt-3">
              <ReviewActions
                submissionId={s.id}
                sections={s.section_id ? undefined : gyms.find((g) => g.id === s.gym_id)?.sections}
              />
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
