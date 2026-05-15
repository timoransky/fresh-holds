import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

type Props = {
  next?: string;
  suggestResetDialogSlot: ReactNode;
  adminLinkSlot: ReactNode;
};

export async function HeaderAuth({
  next = "/",
  suggestResetDialogSlot,
  adminLinkSlot,
}: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`} prefetch={false}>
          Sign in
        </Link>
      </Button>
    );
  }

  return (
    <UserMenu
      email={user.email ?? ""}
      createdAt={user.created_at}
      suggestResetDialogSlot={suggestResetDialogSlot}
      adminLinkSlot={adminLinkSlot}
    />
  );
}
