import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { listMySubmissions } from "@/lib/db/submissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile · Fresh Holds",
};

const statusLabel = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
} as const;

const statusStyle = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-green-50 text-green-700 border border-green-600/20",
  rejected: "bg-destructive/10 text-destructive border border-destructive/20",
} as const;

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const submissions = await listMySubmissions();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-10 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" />
        Back to gyms
      </Link>

      <header className="mt-6">
        <span className="inline-block rounded-full border-2 border-foreground/80 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
          fresh holds
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <strong className="text-foreground">{user.email}</strong>. Visits sync to
          this account across devices.
        </p>
      </header>

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
                    {s.gym_name} — {s.section_name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      statusStyle[s.status],
                    )}
                  >
                    {statusLabel[s.status]}
                  </span>
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
    </main>
  );
}
