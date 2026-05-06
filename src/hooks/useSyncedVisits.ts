"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisits } from "@/hooks/useVisits";
import { mergeFromLocal, setVisitsForGym } from "@/lib/actions/visits";

// Wraps useVisits to keep an authed user's visits in sync with the `visits`
// table. localStorage stays the synchronous read source for the UI, so the
// list never waits on the network. Anonymous users get the original behavior.
export function useSyncedVisits(authed: boolean) {
  const base = useVisits();
  const merged = useRef(false);

  useEffect(() => {
    if (!authed) {
      merged.current = false;
      return;
    }
    if (merged.current) return;
    merged.current = true;

    let canceled = false;
    (async () => {
      try {
        const server = await mergeFromLocal(base.history);
        if (canceled) return;
        for (const [slug, dates] of Object.entries(server)) {
          base.setVisits(slug, dates);
        }
      } catch {
        merged.current = false;
      }
    })();

    return () => {
      canceled = true;
    };
    // base.setVisits is stable; base.history is intentionally read once at
    // sync time so we don't re-merge on every local write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const setVisits = useCallback(
    (gymSlug: string, isoDates: string[]) => {
      base.setVisits(gymSlug, isoDates);
      if (authed) {
        setVisitsForGym(gymSlug, isoDates).catch(() => {
          // Network/server failures don't block the local UI; the next
          // sign-in will reconcile via mergeFromLocal.
        });
      }
    },
    [authed, base],
  );

  const markVisited = useCallback(
    (gymSlug: string, isoDate?: string) => {
      base.markVisited(gymSlug, isoDate);
      if (authed) {
        const next = base.history[gymSlug] ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const merged = [...new Set([...next, isoDate ?? today])].sort();
        setVisitsForGym(gymSlug, merged).catch(() => {});
      }
    },
    [authed, base],
  );

  return { ...base, setVisits, markVisited };
}
