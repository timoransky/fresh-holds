"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { todayISO } from "@/lib/date";
import { VISITS_COOKIE } from "@/lib/visit-cookie";

const STORAGE_KEY = "freshholds:visits";
const CHANGE_EVENT = "freshholds:visits-change";
const COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60; // 1 year

export type VisitHistory = Record<string, string[]>;
export type Visits = Record<string, string>;

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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: VisitHistory = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") {
        out[slug] = [value];
      } else if (Array.isArray(value)) {
        const dates = value.filter((d): d is string => typeof d === "string");
        if (dates.length > 0) {
          out[slug] = [...new Set(dates)].sort();
        }
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

export function useVisits() {
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

  // Mirror the latest-visit-per-gym map into a cookie so the server can
  // pre-rank the home page on the next refresh. Fires after every change
  // (including the first post-hydration mount, which seeds a missing
  // cookie from existing localStorage).
  useEffect(() => {
    writeVisitsCookie(visits);
  }, [visits]);

  const markVisited = useCallback((gymSlug: string, isoDate?: string) => {
    try {
      const current = parseHistory(readRaw());
      const dates = new Set(current[gymSlug] ?? []);
      dates.add(isoDate ?? todayISO());
      writeHistory({ ...current, [gymSlug]: [...dates].sort() });
      setWriteError(null);
    } catch (e) {
      setWriteError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  const setVisits = useCallback((gymSlug: string, isoDates: string[]) => {
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
  }, []);

  return { visits, history, markVisited, setVisits, writeError };
}
