"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { pullMyVisits, pushMyVisits, setVisitsForGym } from "@/lib/actions/visits";
import { reconcile } from "./reconcile";
import type { Visits, VisitHistory } from "./types";
import { VISITS_COOKIE } from "./types";

const STORAGE_KEY = "freshholds:visits";
const CHANGE_EVENT = "freshholds:visits-change";
const COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;
const SYNCED_KEY = "fh-synced-session";

function writeVisitsCookie(visits: Visits): void {
  if (typeof document === "undefined") return;
  if (Object.keys(visits).length === 0) {
    document.cookie = `${VISITS_COOKIE}=; path=/; max-age=0; samesite=lax`;
    return;
  }
  const value = encodeURIComponent(JSON.stringify(visits));
  document.cookie = `${VISITS_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE_S}; samesite=lax`;
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parseHistory(raw: string): VisitHistory {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: VisitHistory = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") {
        out[slug] = [value];
      } else if (Array.isArray(value)) {
        const dates = value.filter((d): d is string => typeof d === "string");
        if (dates.length > 0) out[slug] = [...new Set(dates)].sort();
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeHistory(history: VisitHistory): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  const onChange = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const SERVER_SNAPSHOT = "{}";
function getServerSnapshot(): string {
  return SERVER_SNAPSHOT;
}

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
    // Disabled storage — we'll resync on next mount, harmless.
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

// The single Visit log hook. localStorage is the canonical client store;
// the fh-visits cookie mirrors latest-per-gym so the server can pre-rank.
// When authed=true, the hook also reconciles with the server's visits
// table — once per tab session, deduped via sessionStorage so concurrent
// consumers (GymList + MembershipCard) only fire one network call.
export function useVisitLog(authed: boolean) {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  const history = useMemo(() => parseHistory(raw), [raw]);
  const [writeError, setWriteError] = useState<Error | null>(null);

  const visits = useMemo<Visits>(() => {
    const latest: Visits = {};
    for (const [slug, dates] of Object.entries(history)) {
      if (dates.length === 0) continue;
      latest[slug] = dates.reduce((max, d) => (d > max ? d : max));
    }
    return latest;
  }, [history]);

  // Cookie mirror — every visits change refreshes the fh-visits cookie
  // so the server-side pre-rank on the next request reflects reality.
  useEffect(() => {
    writeVisitsCookie(visits);
  }, [visits]);

  // Server reconciliation — once per tab session per authed user.
  const syncing = useRef(false);
  useEffect(() => {
    if (!authed) {
      // Sign-out: clear flags so the next sign-in (possibly different
      // user) triggers a fresh reconciliation.
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
        const localNow = parseHistory(readRaw());
        const { applyLocal, push } = reconcile(localNow, remote);

        if (applyLocal !== null) {
          try {
            writeHistory(applyLocal);
            setWriteError(null);
          } catch (e) {
            setWriteError(e instanceof Error ? e : new Error(String(e)));
          }
        }
        if (push !== null) {
          pushMyVisits(push).catch(() => {
            // Local stays canonical; next sign-in retries via this flow.
          });
        }
        writeSyncedFlag();
      } catch {
        // Network/auth blip — leave flag unset so next mount retries.
        syncing.current = false;
      }
    })();

    return () => {
      canceled = true;
    };
  }, [authed]);

  const setVisits = useCallback(
    (gymSlug: string, isoDates: string[]) => {
      try {
        const current = parseHistory(readRaw());
        const deduped = [...new Set(isoDates)].sort();
        if (deduped.length === 0) {
          const { [gymSlug]: _, ...rest } = current;
          writeHistory(rest);
        } else {
          writeHistory({ ...current, [gymSlug]: deduped });
        }
        setWriteError(null);
      } catch (e) {
        setWriteError(e instanceof Error ? e : new Error(String(e)));
      }

      if (authed) {
        setVisitsForGym(gymSlug, isoDates).catch(() => {
          // Network failure doesn't block the local UI; next mount
          // reconciles via pullMyVisits.
        });
      }
    },
    [authed],
  );

  return { visits, history, setVisits, writeError };
}
