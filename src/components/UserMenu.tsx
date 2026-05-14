"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SuggestResetForm } from "@/components/SuggestResetForm";
import { AvatarTrigger } from "@/components/user/AvatarTrigger";
import { MembershipCard } from "@/components/user/MembershipCard";
import type { GymWithSections, VisitHistory } from "@/lib/types";

type Props = {
  email: string;
  createdAt?: string | null;
  gyms: GymWithSections[];
  isAdmin?: boolean;
  visitHistory: VisitHistory;
};

export function UserMenu({ email, createdAt, gyms, isAdmin, visitHistory }: Props) {
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
          className="w-72 origin-top-right overflow-hidden squircle-3xl rounded-2xl bg-card p-0 ring-1 ring-brand/15 shadow-2xl shadow-brand-shadow/25"
        >
          <MembershipCard
            email={email}
            createdAt={createdAt}
            onSuggestReset={handleSuggestReset}
            isAdmin={isAdmin}
            visitHistory={visitHistory}
          />
        </PopoverContent>
      </Popover>
      <SuggestResetForm gyms={gyms} open={suggestOpen} onOpenChange={setSuggestOpen} />
    </>
  );
}
