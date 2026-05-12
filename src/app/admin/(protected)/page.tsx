import { Suspense } from "react";
import type { Metadata } from "next";
import { getGymsForAdmin, getRecentResets } from "@/lib/db/admin";
import { ResetForm } from "@/components/admin/ResetForm";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin · Fresh Holds",
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight">Reset log</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
        <div className="flex flex-col gap-3 lg:sticky top-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Log a reset
          </h2>
          <Card>
            <CardContent>
              <Suspense fallback={<ResetFormFallback />}>
                <ResetFormSection />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent resets
          </h2>

          <Suspense fallback={<RecentResetsFallback />}>
            <RecentResetsSection />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function ResetFormSection() {
  const gyms = await getGymsForAdmin();
  return <ResetForm gyms={gyms} />;
}

async function RecentResetsSection() {
  const recentResets = await getRecentResets();

  if (recentResets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-foreground/20 p-6 text-sm text-muted-foreground">
        No resets logged yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recentResets.map((r) => (
        <Card key={r.id}>
          <CardContent>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{r.gym_name}</span>
              <span className="tabular-nums text-xs text-muted-foreground">{r.reset_on}</span>
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {r.section_name}
              {r.boulders_reset !== null && (
                <span className="ml-1 text-xs">· {r.boulders_reset} boulders</span>
              )}
            </div>
            {r.notes && <div className="mt-1 text-xs text-muted-foreground/70">{r.notes}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResetFormFallback() {
  return <div aria-hidden className="h-40 rounded-lg bg-foreground/5" />;
}

function RecentResetsFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="h-20 rounded-xl bg-foreground/5" />
      <div className="h-20 rounded-xl bg-foreground/5" />
      <div className="h-20 rounded-xl bg-foreground/5" />
    </div>
  );
}
