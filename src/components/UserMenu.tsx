"use client";

import { UserIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  email: string;
};

export function UserMenu({ email }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          aria-label={`Account menu (${email})`}
        >
          <UserIcon className="size-3.5" />
          <span className="max-w-[140px] truncate text-xs">{email}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle className="truncate">{email}</PopoverTitle>
          <PopoverDescription>
            Your account keeps your gym visits in sync across devices.
          </PopoverDescription>
        </PopoverHeader>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
