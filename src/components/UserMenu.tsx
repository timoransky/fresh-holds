"use client";

import { useState } from "react";
import { LogOutIcon, SparklesIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SuggestResetForm } from "@/components/SuggestResetForm";
import { useVisits } from "@/hooks/useVisits";
import type { GymWithSections } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  createdAt?: string | null;
  gyms: GymWithSections[];
};

function getInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function AvatarTrigger({
  email,
  className,
  ...props
}: React.ComponentProps<"button"> & { email: string }) {
  return (
    <button
      type="button"
      aria-label={`Account menu (${email})`}
      className={cn(
        "relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full",
        "bg-cobalt text-background font-heading text-base font-bold leading-none",
        "border border-cobalt-shadow shadow-[0_2px_0_0_var(--color-cobalt-shadow)]",
        "transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--color-cobalt-shadow)]",
        "focus-visible:-translate-y-0.5 focus-visible:shadow-[0_4px_0_0_var(--color-cobalt-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:translate-y-px active:shadow-[0_1px_0_0_var(--color-cobalt-shadow)]",
        "aria-expanded:-translate-y-0.5 aria-expanded:shadow-[0_4px_0_0_var(--color-cobalt-shadow)]",
        className,
      )}
      {...props}
    >
      <span className="translate-y-px">{getInitial(email)}</span>
    </button>
  );
}

function MembershipCard({
  email,
  createdAt,
  onSuggestReset,
}: {
  email: string;
  createdAt?: string | null;
  onSuggestReset: () => void;
}) {
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

      <div className="px-5 pt-4 pb-5">
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
      </div>
    </div>
  );
}

export function UserMenu({ email, createdAt, gyms }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const handleSuggestReset = () => {
    setOpen(false);
    setSuggestOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <AvatarTrigger email={email} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-72 origin-top-right overflow-hidden squircle-4xl rounded-3xl bg-card p-0 ring-1 ring-cobalt/15 shadow-2xl shadow-cobalt-shadow/25"
        >
          <MembershipCard
            email={email}
            createdAt={createdAt}
            onSuggestReset={handleSuggestReset}
          />
        </PopoverContent>
      </Popover>
      <SuggestResetForm gyms={gyms} open={suggestOpen} onOpenChange={setSuggestOpen} />
    </>
  );
}
