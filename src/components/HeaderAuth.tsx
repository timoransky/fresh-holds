import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import type { GymWithSections } from "@/lib/types";

type Props = {
  next?: string;
  gyms: GymWithSections[];
};

export async function HeaderAuth({ next = "/", gyms }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </Button>
    );
  }

  return <UserMenu email={user.email ?? ""} createdAt={user.created_at} gyms={gyms} />;
}
