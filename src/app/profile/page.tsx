import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { listMySubmissions } from "@/lib/db/submissions";
import { Badge } from "@/components/ui/badge";
import { BrandBadge } from "@/components/ui/brand-badge";
import { Button } from "@/components/ui/button";
import type { SubmissionStatus } from "@/lib/db/submissions";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

const statusLabel = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
} as const;

const statusVariant = {
  pending: "secondary",
  approved: "success",
  rejected: "destructive",
} as const satisfies Record<SubmissionStatus, "secondary" | "success" | "destructive">;

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-10 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3" />
        Back to gyms
      </Link>

      <header className="mt-6">
        <BrandBadge>fresh holds</BrandBadge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Your profile</h1>
      </header>

      <Suspense fallback={<ProfileContentFallback />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

async function ProfileContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const submissions = await listMySubmissions();

  return (
    <>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as <strong className="text-foreground">{user.email}</strong>. Visits sync to this
        account across devices.
      </p>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your reset suggestions
        </h2>

        {submissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-foreground/20 p-5 text-sm text-muted-foreground">
            You haven&rsquo;t suggested any resets yet. Open the account menu and choose{" "}
            <span className="font-semibold text-foreground">Suggest a reset</span> after you spot
            fresh climbing.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-background p-4 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {s.gym_name} —{" "}
                    {s.section_name ?? <span className="italic">across the gym</span>}
                  </span>
                  <Badge
                    variant={statusVariant[s.status]}
                    className="uppercase tracking-wider text-[10px] font-semibold"
                  >
                    {statusLabel[s.status]}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Reset on {s.reset_on}
                  {s.boulders_reset !== null && (
                    <span className="ml-1 text-foreground/80">· {s.boulders_reset} new boulders</span>
                  )}
                </div>
                {s.notes && (
                  <div className="mt-2 text-xs text-muted-foreground/80">{s.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </section>
    </>
  );
}

function ProfileContentFallback() {
  return (
    <div aria-hidden className="mt-4 space-y-6">
      <div className="h-4 w-2/3 rounded bg-foreground/5" />
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-foreground/5" />
        <div className="h-20 rounded-xl bg-foreground/5" />
      </div>
    </div>
  );
}
