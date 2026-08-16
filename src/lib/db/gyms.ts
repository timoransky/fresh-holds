import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { gyms, resets, sections } from "@/db/schema";
import { DAY_MS, isoFromDate, todayISO } from "@/lib/date";
import type { GymWithSections } from "@/lib/types";

// Resets older than this are excluded — keeps the homepage payload focused on
// actionable freshness data. Tune if users start asking about older sessions.
const RESET_HISTORY_DAYS = 240;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export const getActiveGymsWithSections = unstable_cache(
  async (): Promise<GymWithSections[]> => {
    const cutoffISO = isoFromDate(new Date(Date.now() - RESET_HISTORY_DAYS * DAY_MS));
    const todayStr = todayISO();

    // Public read (RLS `using (true)`) — runs on the plain owner connection.
    // The 240-day window and is_active/ordering filters are pushed down; resets
    // are already sorted newest-first per section. Only gyms with ≥1 active
    // section are kept (the old query's `sections!inner`).
    const rows = await db.query.gyms.findMany({
      columns: {
        id: true,
        slug: true,
        name: true,
        neighborhood: true,
        website_url: true,
        instagram_handle: true,
        iclub_slug: true,
        city_id: true,
      },
      where: eq(gyms.is_active, true),
      orderBy: [asc(gyms.display_order)],
      with: {
        sections: {
          columns: { id: true, name: true, display_order: true, is_active: true },
          where: eq(sections.is_active, true),
          orderBy: [asc(sections.display_order)],
          with: {
            resets: {
              columns: { id: true, reset_on: true, notes: true, boulders_reset: true },
              where: and(gte(resets.reset_on, cutoffISO), lte(resets.reset_on, todayStr)),
              orderBy: [desc(resets.reset_on)],
            },
          },
        },
      },
    });

    return rows.filter((gym) => gym.sections.length > 0) as GymWithSections[];
  },
  ["active-gyms-with-sections"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);
