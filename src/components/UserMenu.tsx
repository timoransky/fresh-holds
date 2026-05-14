"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarTrigger } from "@/components/user/AvatarTrigger";
import { MembershipCard } from "@/components/user/MembershipCard";
import { SuggestResetContext } from "@/components/user/SuggestResetContext";

type Props = {
  email: string;
  createdAt?: string | null;
  suggestResetDialogSlot: ReactNode;
  adminLinkSlot: ReactNode;
};

export function UserMenu({
  email,
  createdAt,
  suggestResetDialogSlot,
  adminLinkSlot,
}: Props) {
  const [open, setOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const closePopover = useCallback(() => setOpen(false), []);

  const suggestCtx = useMemo(
    () => ({ open: suggestOpen, setOpen: setSuggestOpen, closePopover }),
    [suggestOpen, closePopover],
  );

  return (
    <SuggestResetContext value={suggestCtx}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <AvatarTrigger email={email} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-72 origin-top-right overflow-hidden squircle-3xl rounded-2xl bg-card p-0 ring-1 ring-brand/15 shadow-2xl shadow-brand-shadow/25"
        >
          <MembershipCard
            email={email}
            createdAt={createdAt}
            adminLinkSlot={adminLinkSlot}
          />
        </PopoverContent>
      </Popover>
      {suggestResetDialogSlot}
    </SuggestResetContext>
  );
}
