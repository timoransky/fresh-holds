"use client";

import { createContext, use } from "react";

export type VisitHistoryContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closePopover: () => void;
};

export const VisitHistoryContext = createContext<VisitHistoryContextValue | null>(null);

export function useVisitHistory(): VisitHistoryContextValue {
  const ctx = use(VisitHistoryContext);
  if (!ctx) {
    throw new Error("useVisitHistory must be used inside <VisitHistoryContext>");
  }
  return ctx;
}
