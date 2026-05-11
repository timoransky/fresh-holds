"use client";

import Link from "next/link";
import { LogOutIcon, ShieldIcon, SparklesIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { useVisits } from "@/hooks/useVisits";

function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

type Props = {
  email: string;
  createdAt?: string | null;
  onSuggestReset: () => void;
  isAdmin?: boolean;
};

export function MembershipCard({ email, createdAt, onSuggestReset, isAdmin }: Props) {
  const { history } = useVisits();
  const visitCount = Object.values(history).reduce((sum, dates) => sum + dates.length, 0);
  const gymCount = Object.keys(history).length;
  const memberSince = formatMemberSince(createdAt);

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{email}</div>
          {memberSince && (
            <div className="text-xs text-muted-foreground">member since {memberSince}</div>
          )}
        </div>
        <div>
          <Button
            onClick={() => signOut()}
            size="icon-xs"
            variant="outline"
            className="rounded-full squircle"
          >
            <LogOutIcon className="" />
          </Button>
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-2 gap-2 rounded-md squircle-lg border border-border bg-muted/20 p-3">
        <div className="flex flex-col items-center text-center">
          <span className="font-heading text-2xl font-bold leading-none text-foreground">
            {visitCount}
          </span>
          <span className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            visits logged
          </span>
        </div>
        <div className="flex flex-col items-center text-center border-l border-border">
          <span className="font-heading text-2xl font-bold leading-none text-foreground">
            {gymCount}
          </span>
          <span className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            gyms tried
          </span>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5 space-y-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="w-full"
          onClick={onSuggestReset}
        >
          <SparklesIcon />
          Suggest a reset
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/admin">
              <ShieldIcon />
              Open admin
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
