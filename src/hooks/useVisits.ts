"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "freshholds:visits";
const CHANGE_EVENT = "freshholds:visits-change";

export type Visits = Record<string, string>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parseVisits(raw: string): Visits {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Visits;
    }
  } catch {
    // ignore — fall through to empty object
  }
  return {};
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
  const visits = useMemo(() => parseVisits(raw), [raw]);

  const markVisited = useCallback((gymSlug: string, isoDate?: string) => {
    try {
      const current = parseVisits(readRaw());
      const next = { ...current, [gymSlug]: isoDate ?? todayISO() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // storage unavailable — silently ignore
    }
  }, []);

  return { visits, markVisited };
}
