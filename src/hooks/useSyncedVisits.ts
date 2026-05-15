"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisits } from "@/hooks/useVisits";
import { pullMyVisits, pushMyVisits, setVisitsForGym } from "@/lib/actions/visits";
import { historiesEqual, unionHistories } from "@/lib/visit-history";
import { todayISO } from "@/lib/date";

// Wraps useVisits to keep an authed user's visits in sync with the
// `visits` table. localStorage stays the synchronous source of truth for
// the UI, so rendering never waits on the network. On mount we ask the
// server "am I authed, and what do you have?" once via pullMyVisits;
// the response tells us both whether to push and whether subsequent
// writes need a server-action call. All failures leave localStorage
// as-is — we'll reconcile on the next mount.
export function useSyncedVisits() {
  const base = useVisits();
  // null = unknown (still pulling), true/false = known auth state.
  const authedRef = useRef<boolean | null>(null);
  const reconciled = useRef(false);

  useEffect(() => {
    if (reconciled.current) return;
    reconciled.current = true;

    let canceled = false;
    (async () => {
      try {
        const { authed, history: remote } = await pullMyVisits();
        if (canceled) return;

        authedRef.current = authed;
        if (!authed) return;

        // Snapshot local at apply time (it may have changed during the
        // network round-trip — e.g. a click while we were waiting).
        const localNow = base.history;
        const union = unionHistories(localNow, remote);

        if (!historiesEqual(union, localNow)) {
          base.setHistory(union);
        }
        // Push only if we have rows the server doesn't yet.
        if (!historiesEqual(union, remote)) {
          pushMyVisits(union).catch(() => {
            // Local stays canonical; next mount retries via this same flow.
          });
        }
      } catch {
        // Network blip — leave reconciled.current true so we don't thrash.
        // Subsequent writes will skip server-actions because authedRef
        // stays null, treated as "not known to be authed".
      }
    })();

    return () => {
      canceled = true;
    };
    // base.history / base.setHistory are intentionally not in deps — we
    // only reconcile once per mount, not on every visits change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVisits = useCallback(
    (gymSlug: string, isoDates: string[]) => {
      base.setVisits(gymSlug, isoDates);
      if (authedRef.current === true) {
        setVisitsForGym(gymSlug, isoDates).catch(() => {
          // Network/server failures don't block the local UI; the next
          // mount reconciles via pullMyVisits.
        });
      }
    },
    [base],
  );

  const markVisited = useCallback(
    (gymSlug: string, isoDate?: string) => {
      base.markVisited(gymSlug, isoDate);
      if (authedRef.current === true) {
        const next = base.history[gymSlug] ?? [];
        const merged = [...new Set([...next, isoDate ?? todayISO()])].sort();
        setVisitsForGym(gymSlug, merged).catch(() => {});
      }
    },
    [base],
  );

  return { ...base, setVisits, markVisited };
}
