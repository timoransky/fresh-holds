"use client";

import { createContext, useContext } from "react";

export type SuggestResetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closePopover: () => void;
};

export const SuggestResetContext = createContext<SuggestResetContextValue | null>(null);

export function useSuggestReset(): SuggestResetContextValue {
  const ctx = useContext(SuggestResetContext);
  if (!ctx) {
    throw new Error("useSuggestReset must be used inside <SuggestResetContext>");
  }
  return ctx;
}
