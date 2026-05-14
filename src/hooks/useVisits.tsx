"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setVisitsForGym } from "@/lib/actions/visits";
import { todayISO } from "@/lib/date";
import { historyToLatestVisits } from "@/lib/visits-utils";
import type { VisitHistory, Visits } from "@/lib/types";

export type { VisitHistory, Visits };

type VisitsContextValue = {
  visits: Visits;
  history: VisitHistory;
  setVisits: (gymSlug: string, isoDates: string[]) => void;
  markVisited: (gymSlug: string, isoDate?: string) => void;
  writeError: Error | null;
};

const VisitsContext = createContext<VisitsContextValue | null>(null);

export function VisitsProvider({
  initialHistory,
  children,
}: {
  initialHistory: VisitHistory;
  children: ReactNode;
}) {
  const [history, setHistory] = useState<VisitHistory>(initialHistory);
  const [writeError, setWriteError] = useState<Error | null>(null);

  const visits = useMemo(() => historyToLatestVisits(history), [history]);

  const setVisits = useCallback((gymSlug: string, isoDates: string[]) => {
    const deduped = [...new Set(isoDates)].sort();
    setHistory((prev) => {
      if (deduped.length === 0) {
        const next = { ...prev };
        delete next[gymSlug];
        return next;
      }
      return { ...prev, [gymSlug]: deduped };
    });
    setVisitsForGym(gymSlug, deduped)
      .then(() => setWriteError(null))
      .catch((e: unknown) =>
        setWriteError(e instanceof Error ? e : new Error(String(e))),
      );
  }, []);

  const markVisited = useCallback(
    (gymSlug: string, isoDate?: string) => {
      const next = [
        ...new Set([...(history[gymSlug] ?? []), isoDate ?? todayISO()]),
      ].sort();
      setVisits(gymSlug, next);
    },
    [history, setVisits],
  );

  const value = useMemo<VisitsContextValue>(
    () => ({ visits, history, setVisits, markVisited, writeError }),
    [visits, history, setVisits, markVisited, writeError],
  );

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
}

export function useVisits(): VisitsContextValue {
  const ctx = useContext(VisitsContext);
  if (!ctx) {
    throw new Error("useVisits must be used within a <VisitsProvider>");
  }
  return ctx;
}
