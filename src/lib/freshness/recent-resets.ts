import type { Section } from "@/lib/types";
import { DAY_MS, isoFromDate } from "@/lib/date";
import { ANON_VISIT_GAP_DAYS } from "@/lib/freshness/scoring";

// Compact-sector gyms (≤ 2 sectors) get a per-reset list instead of one row per
// sector — otherwise weekly drops collapse into a single row and hide activity.
const COMPACT_SECTOR_LIMIT = 2;

// Hard cap on rendered rows. Tune if real gyms regularly exceed this.
const MAX_RECENT_ROWS = 10;

export type RecentReset = {
  id: string;
  reset_on: string;
  section_id: string;
  section_name: string;
  boulders_reset: number | null;
};

export function isCompactSectorGym(sections: Section[]): boolean {
  return sections.length > 0 && sections.length <= COMPACT_SECTOR_LIMIT;
}

// Every row returned is "new" relative to the same cutoff the scorer uses
// (your last visit, or the 28-day anon window), so the expanded list shows
// exactly what the badge and narrative count — no per-row fresh flag needed.
export function recentResets(sections: Section[], lastVisitedISO: string | null): RecentReset[] {
  const anonCutoffISO = isoFromDate(new Date(Date.now() - ANON_VISIT_GAP_DAYS * DAY_MS));
  const cutoffISO = lastVisitedISO ?? anonCutoffISO;

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
      });
    }
  }
  rows.sort((a, b) => b.reset_on.localeCompare(a.reset_on));
  return rows.slice(0, MAX_RECENT_ROWS);
}
