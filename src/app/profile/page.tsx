import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile · Fresh Holds",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

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

      <section className="mt-8 flex flex-col gap-4">
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </section>
    </main>
  );
}
