import Link from "next/link";
import { UserIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Props = {
  next?: string;
};

export async function HeaderAuth({ next = "/" }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5">
      <Link href="/profile" aria-label={`Profile (${user.email})`}>
        <UserIcon className="size-3.5" />
        <span className="max-w-[140px] truncate text-xs">{user.email}</span>
      </Link>
    </Button>
  );
}
