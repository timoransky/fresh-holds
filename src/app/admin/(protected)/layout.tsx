import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="inline-block rounded-full border-2 border-foreground/80 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
            fresh holds · admin
          </span>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Access restricted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as <strong className="text-foreground">{user.email}</strong>. Your account
            doesn&apos;t have admin access yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Set{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              is_admin = true
            </code>{" "}
            for your row in the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">profiles</code>{" "}
            table in Supabase, then refresh.
          </p>
          <form action={signOut} className="mt-8">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const { count: pendingCount } = await supabase
    .from("reset_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-block rounded-full border-2 border-foreground/80 bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground"
            >
              fresh holds · admin
            </Link>
            <Link
              href="/admin/submissions"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Submissions
              {pendingCount && pendingCount > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="xs">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
