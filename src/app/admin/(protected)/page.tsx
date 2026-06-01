import { Suspense } from "react";
import type { Metadata } from "next";
import { getGymsForAdmin, getRecentResets } from "@/lib/db/admin";
import { parseRecentResetSort, type RecentResetSortKey } from "@/lib/db/admin-sort";
import { ResetForm } from "@/components/admin/ResetForm";
import { RecentResetsSort } from "@/components/admin/RecentResetsSort";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin · Fresh Holds",
};

type Props = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const { sort } = await searchParams;
  const sortBy = parseRecentResetSort(sort);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight">Reset log</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
        <div className="flex flex-col gap-3 lg:sticky top-6">
          <div className="flex h-8 items-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Log a reset
            </h2>
          </div>
          <Card>
            <CardContent>
              <Suspense fallback={<ResetFormFallback />}>
                <ResetFormSection />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex h-8 items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent resets
            </h2>
            <RecentResetsSort value={sortBy} />
          </div>

          <Suspense key={sortBy} fallback={<RecentResetsFallback />}>
            <RecentResetsSection sortBy={sortBy} />
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

async function RecentResetsSection({ sortBy }: { sortBy: RecentResetSortKey }) {
  const recentResets = await getRecentResets({ sortBy });

  if (recentResets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-foreground/20 p-6 text-sm text-muted-foreground">
        No resets logged yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {recentResets.map((r) => (
        <Card key={r.id} size="sm">
          <CardContent>
            <div className="font-medium">{r.gym_name}</div>
            <div className="mt-0.5 text-muted-foreground">
              {r.section_name}
              {r.boulders_reset !== null && (
                <span className="ml-1 text-xs">· {r.boulders_reset} boulders</span>
              )}
            </div>
            {r.notes && <div className="mt-1 text-xs text-muted-foreground/70">{r.notes}</div>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
              <span>Reset at: {r.reset_on}</span>
              <span>Logged at: {formatLoggedAt(r.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatLoggedAt(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
