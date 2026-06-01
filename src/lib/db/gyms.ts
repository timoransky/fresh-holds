import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/utils/supabase/server";
import { isoFromDate, todayISO } from "@/lib/date";
import type { GymWithSections } from "@/lib/types";

// Resets older than this are excluded — keeps the homepage payload focused on
// actionable freshness data. Tune if users start asking about older sessions.
const RESET_HISTORY_DAYS = 240;
const DAY_MS = 24 * 60 * 60 * 1000;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export const getActiveGymsWithSections = unstable_cache(
  async (): Promise<GymWithSections[]> => {
    const supabase = createAnonClient();

    const cutoffISO = isoFromDate(new Date(Date.now() - RESET_HISTORY_DAYS * DAY_MS));
    const todayStr = todayISO();

    const { data, error } = await supabase
      .from("gyms")
      .select(
        `
        id, slug, name, neighborhood, website_url, instagram_handle, iclub_slug, city_id,
        sections!inner (
          id, name, display_order, is_active,
          resets ( id, reset_on, notes, boulders_reset )
        )
      `,
      )
      .eq("is_active", true)
      .eq("sections.is_active", true)
      .gte("sections.resets.reset_on", cutoffISO)
      .lte("sections.resets.reset_on", todayStr)
      .order("display_order", { ascending: true })
      .order("display_order", { referencedTable: "sections", ascending: true })
      .order("reset_on", {
        referencedTable: "sections.resets",
        ascending: false,
      });

    if (error) {
      throw new Error(`Failed to load gyms: ${error.message}`);
    }

    return (data ?? []) as GymWithSections[];
  },
  ["active-gyms-with-sections"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);
