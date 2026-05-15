"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisits } from "@/hooks/useVisits";
import { pullMyVisits, pushMyVisits, setVisitsForGym } from "@/lib/actions/visits";
import { historiesEqual, unionHistories } from "@/lib/visit-history";
import { todayISO } from "@/lib/date";

// Per-tab flag: once we've reconciled with the server in this session, we
// don't refetch on subsequent navigations / refreshes. Cleared via the
// auth flow on sign-out.
const SYNCED_KEY = "fh-synced-session";

function readSyncedFlag(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(SYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSyncedFlag(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SYNCED_KEY, "1");
  } catch {
    // sessionStorage disabled — we'll just resync next nav, harmless.
  }
}

function clearSyncedFlag(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SYNCED_KEY);
  } catch {
    // ignore
  }
}

// Wraps useVisits to keep an authed user's visits in sync with the
// `visits` table. localStorage stays the synchronous source of truth for
// the UI, so rendering never waits on the network. The reconciliation
// pass is fire-and-forget: pull once per tab session, union with local,
// apply in a single atomic write, push any local additions back. All
// failures leave localStorage as-is — we'll reconcile on the next sign-in.
export function useSyncedVisits(authed: boolean) {
  const base = useVisits();
  const syncing = useRef(false);

  useEffect(() => {
    if (!authed) {
      // Reset for the next sign-in: clear both the in-flight guard and the
      // session flag, so signing back in (possibly as a different user)
      // triggers a fresh reconciliation.
      syncing.current = false;
      clearSyncedFlag();
      return;
    }
    if (syncing.current) return;
    if (readSyncedFlag()) return;
    syncing.current = true;

    let canceled = false;
    (async () => {
      try {
        const remote = await pullMyVisits();
        if (canceled) return;

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
            // Local stays canonical; next sign-in retries via this same flow.
          });
        }
        writeSyncedFlag();
      } catch {
        // Network/auth blip — leave the flag unset so we retry on next mount.
        syncing.current = false;
      }
    })();

    return () => {
      canceled = true;
    };
    // base.history / base.setHistory are intentionally not in deps — we
    // only want to run this reconciliation once per session, not whenever
    // history changes from clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const setVisits = useCallback(
    (gymSlug: string, isoDates: string[]) => {
      base.setVisits(gymSlug, isoDates);
      if (authed) {
        setVisitsForGym(gymSlug, isoDates).catch(() => {
          // Network/server failures don't block the local UI; the next
          // sign-in or page mount reconciles via pullMyVisits.
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
        const merged = [...new Set([...next, isoDate ?? todayISO()])].sort();
        setVisitsForGym(gymSlug, merged).catch(() => {});
      }
    },
    [authed, base],
  );

  return { ...base, setVisits, markVisited };
}
