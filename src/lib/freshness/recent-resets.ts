import type { Section } from "@/lib/types";
import { isoFromDate } from "@/lib/date";

// Compact-sector gyms (≤ 2 sectors) get a per-reset list instead of one row per
// sector — otherwise weekly drops collapse into a single row and hide activity.
const COMPACT_SECTOR_LIMIT = 2;

// Fallback window for never-visited users (and an outer bound when the user has
// been away longer). ~8 weekly drops feels like "recent" without being a wall.
const RECENT_FALLBACK_DAYS = 60;

// Hard cap on rendered rows. Tune if real gyms regularly exceed this.
const MAX_RECENT_ROWS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecentReset = {
  id: string;
  reset_on: string;
  section_id: string;
  section_name: string;
  boulders_reset: number | null;
  isFresh: boolean;
};

export function isCompactSectorGym(sections: Section[]): boolean {
  return sections.length > 0 && sections.length <= COMPACT_SECTOR_LIMIT;
}

export function recentResets(sections: Section[], lastVisitedISO: string | null): RecentReset[] {
  const fallbackISO = isoFromDate(new Date(Date.now() - RECENT_FALLBACK_DAYS * DAY_MS));
  const cutoffISO = lastVisitedISO ?? fallbackISO;

  const rows: RecentReset[] = [];
  for (const section of sections) {
    for (const reset of section.resets) {
      if (reset.reset_on <= cutoffISO) continue;
      rows.push({
        id: reset.id,
        reset_on: reset.reset_on,
        section_id: section.id,
        section_name: section.name,
        boulders_reset: reset.boulders_reset,
        isFresh: lastVisitedISO === null || reset.reset_on > lastVisitedISO,
      });
    }
  }
  rows.sort((a, b) => b.reset_on.localeCompare(a.reset_on));
  return rows.slice(0, MAX_RECENT_ROWS);
}
