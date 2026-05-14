import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import { isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function AdminMenuLink() {
  const admin = await isAdmin();
  if (!admin) return null;

  return (
    <Button asChild variant="outline" size="sm" className="w-full">
      <Link href="/admin">
        <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} />
        Open admin
      </Link>
    </Button>
  );
}
