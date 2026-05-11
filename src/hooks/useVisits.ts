"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { todayISO } from "@/lib/date";

const STORAGE_KEY = "freshholds:visits";
const CHANGE_EVENT = "freshholds:visits-change";

export type VisitHistory = Record<string, string[]>;
export type Visits = Record<string, string>;

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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage unavailable — silently ignore
  }
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

  const visits = useMemo<Visits>(() => {
    const latest: Visits = {};
    for (const [slug, dates] of Object.entries(history)) {
      if (dates.length === 0) continue;
      latest[slug] = dates.reduce((max, d) => (d > max ? d : max));
    }
    return latest;
  }, [history]);

  const markVisited = useCallback((gymSlug: string, isoDate?: string) => {
    const current = parseHistory(readRaw());
    const dates = new Set(current[gymSlug] ?? []);
    dates.add(isoDate ?? todayISO());
    writeHistory({ ...current, [gymSlug]: [...dates].sort() });
  }, []);

  const setVisits = useCallback((gymSlug: string, isoDates: string[]) => {
    const current = parseHistory(readRaw());
    const deduped = [...new Set(isoDates)].sort();
    if (deduped.length === 0) {
      const { [gymSlug]: _, ...rest } = current;
      writeHistory(rest);
      return;
    }
    writeHistory({ ...current, [gymSlug]: deduped });
  }, []);

  return { visits, history, markVisited, setVisits };
}
