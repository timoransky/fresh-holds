import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

type Props = {
  next?: string;
};

export async function HeaderAuth({ next = "/" }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild size="sm" className="rounded-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </Button>
    );
  }

  return <UserMenu email={user.email ?? ""} />;
}
