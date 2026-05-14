import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import type { GymWithSections, VisitHistory } from "@/lib/types";

type Props = {
  next?: string;
  gyms: GymWithSections[];
  visitHistory: VisitHistory;
};

export async function HeaderAuth({ next = "/", gyms, visitHistory }: Props) {
  const user = await getCurrentUser();

  // Every visitor has a Supabase user after middleware (anonymous if they
  // never signed in). Show the sign-in CTA until they attach a real email.
  if (!user || user.is_anonymous) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </Button>
    );
  }

  const admin = await isAdmin();

  return (
    <UserMenu
      email={user.email ?? ""}
      createdAt={user.created_at}
      gyms={gyms}
      isAdmin={admin}
      visitHistory={visitHistory}
    />
  );
}
