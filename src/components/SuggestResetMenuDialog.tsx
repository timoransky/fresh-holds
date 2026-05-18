"use client";

import { SuggestResetForm } from "@/components/SuggestResetForm";
import { useSuggestReset } from "@/components/user/SuggestResetContext";
import type { GymWithSectionCatalog } from "@/lib/db/gyms";

type Props = {
  gyms: GymWithSectionCatalog[];
};

export function SuggestResetMenuDialog({ gyms }: Props) {
  const { open, setOpen } = useSuggestReset();
  return <SuggestResetForm gyms={gyms} open={open} onOpenChange={setOpen} />;
}
