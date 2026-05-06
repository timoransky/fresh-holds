"use client";

import { useState } from "react";
import { LogOutIcon, SparklesIcon, UserIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SuggestResetForm } from "@/components/SuggestResetForm";
import type { GymWithSections } from "@/lib/types";

type Props = {
  email: string;
  gyms: GymWithSections[];
};

export function UserMenu({ email, gyms }: Props) {
  const [suggestOpen, setSuggestOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5"
            aria-label={`Account menu (${email})`}
          >
            <UserIcon className="size-3.5" />
            <span className="max-w-[140px] truncate text-xs">{email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Your account keeps your gym visits in sync across devices.
          </p>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSuggestOpen(true)}>
            <SparklesIcon />
            Suggest a reset
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SuggestResetForm gyms={gyms} open={suggestOpen} onOpenChange={setSuggestOpen} />
    </>
  );
}
