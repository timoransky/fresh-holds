"use client";

import { createContext, useContext } from "react";

export type VisitHistoryContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closePopover: () => void;
};

export const VisitHistoryContext = createContext<VisitHistoryContextValue | null>(null);

export function useVisitHistory(): VisitHistoryContextValue {
  const ctx = useContext(VisitHistoryContext);
  if (!ctx) {
    throw new Error("useVisitHistory must be used inside <VisitHistoryContext>");
  }
  return ctx;
}
