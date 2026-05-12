"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVisits, type Visits } from "@/hooks/useVisits";
import { mergeFromLocal, setVisitsForGym } from "@/lib/actions/visits";
import { todayISO } from "@/lib/date";
import type { VisitHistory } from "@/lib/types";

const MIGRATED_FLAG = "freshholds:migrated-to-server";

// Authed users read from server state (seeded by SSR); anonymous users read
// from localStorage. The hook keeps the same return shape so consumers don't
// branch on auth state.
export function useSyncedVisits(authed: boolean, initialVisits: VisitHistory | null) {
  const local = useVisits();
  const [serverHistory, setServerHistory] = useState<VisitHistory>(initialVisits ?? {});
  const [writeError, setWriteError] = useState<Error | null>(null);

  useMigrateLocalToServer(authed, local.history, setServerHistory);

  const serverVisits = useMemo<Visits>(() => latestPerSlug(serverHistory), [serverHistory]);

  const setVisitsAuthed = useCallback((gymSlug: string, isoDates: string[]) => {
    const cleaned = [...new Set(isoDates)].sort();
    setServerHistory((prev) => {
      if (cleaned.length === 0) {
        const next = { ...prev };
        delete next[gymSlug];
        return next;
      }
      return { ...prev, [gymSlug]: cleaned };
    });
    setVisitsForGym(gymSlug, cleaned).catch((e) => {
      setWriteError(e instanceof Error ? e : new Error(String(e)));
    });
  }, []);

  const markVisitedAuthed = useCallback(
    (gymSlug: string, isoDate?: string) => {
      const date = isoDate ?? todayISO();
      let nextForSlug: string[] = [];
      setServerHistory((prev) => {
        nextForSlug = [...new Set([...(prev[gymSlug] ?? []), date])].sort();
        return { ...prev, [gymSlug]: nextForSlug };
      });
      setVisitsForGym(gymSlug, nextForSlug).catch((e) => {
        setWriteError(e instanceof Error ? e : new Error(String(e)));
      });
    },
    [],
  );

  if (authed) {
    return {
      visits: serverVisits,
      history: serverHistory,
      setVisits: setVisitsAuthed,
      markVisited: markVisitedAuthed,
      writeError,
    };
  }
  return local;
}

function useMigrateLocalToServer(
  authed: boolean,
  localHistory: VisitHistory,
  onMerged: (h: VisitHistory) => void,
) {
  const ran = useRef(false);

  useEffect(() => {
    if (!authed) {
      ran.current = false;
      return;
    }
    if (ran.current) return;
    ran.current = true;

    let canceled = false;
    try {
      if (window.localStorage.getItem(MIGRATED_FLAG)) return;
    } catch {
      return;
    }

    if (Object.keys(localHistory).length === 0) {
      try {
        window.localStorage.setItem(MIGRATED_FLAG, "1");
      } catch {
        // ignore; retry next mount
      }
      return;
    }

    mergeFromLocal(localHistory)
      .then((merged) => {
        if (canceled) return;
        onMerged(merged);
        try {
          window.localStorage.setItem(MIGRATED_FLAG, "1");
        } catch {
          // ignore
        }
      })
      .catch(() => {
        ran.current = false;
      });

    return () => {
      canceled = true;
    };
    // localHistory intentionally omitted: ran.current already guards against
    // re-running when localStorage updates for unrelated reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, onMerged]);
}

function latestPerSlug(history: VisitHistory): Visits {
  const out: Visits = {};
  for (const [slug, dates] of Object.entries(history)) {
    if (dates.length === 0) continue;
    out[slug] = dates.reduce((max, d) => (d > max ? d : max));
  }
  return out;
}
