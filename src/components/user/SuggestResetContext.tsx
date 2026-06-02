"use client";

import { createContext, use } from "react";

export type SuggestResetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closePopover: () => void;
};

export const SuggestResetContext = createContext<SuggestResetContextValue | null>(null);

export function useSuggestReset(): SuggestResetContextValue {
  const ctx = use(SuggestResetContext);
  if (!ctx) {
    throw new Error("useSuggestReset must be used inside <SuggestResetContext>");
  }
  return ctx;
}
