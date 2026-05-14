"use client";

import { SuggestResetForm } from "@/components/SuggestResetForm";
import { useSuggestReset } from "@/components/user/SuggestResetContext";
import type { GymWithSections } from "@/lib/types";

type Props = {
  gyms: GymWithSections[];
};

export function SuggestResetMenuDialog({ gyms }: Props) {
  const { open, setOpen } = useSuggestReset();
  return <SuggestResetForm gyms={gyms} open={open} onOpenChange={setOpen} />;
}
