import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/utils/supabase/server";
import { isoFromDate, todayISO } from "@/lib/date";
import type { GymWithSections, Reset } from "@/lib/types";

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

    // Gyms + their named sections (left join — a gym may have zero sections
    // and still log gym-wide resets) + each section's resets in the window.
    const gymsPromise = supabase
      .from("gyms")
      .select(
        `
        id, slug, name, neighborhood, website_url, instagram_handle, city_id,
        sections (
          id, name, display_order, is_active,
          resets!section_id ( id, reset_on, notes, boulders_reset )
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

    // Gym-wide resets in the same window, fetched flat and grouped by gym_id.
    // Two queries beats one because the same row would otherwise travel twice
    // (once under section, once under gym).
    const gymWidePromise = supabase
      .from("resets")
      .select("id, gym_id, reset_on, notes, boulders_reset")
      .is("section_id", null)
      .gte("reset_on", cutoffISO)
      .lte("reset_on", todayStr)
      .order("reset_on", { ascending: false });

    const [{ data: gymsData, error: gymsError }, { data: gymWideData, error: gymWideError }] =
      await Promise.all([gymsPromise, gymWidePromise]);

    if (gymsError) throw new Error(`Failed to load gyms: ${gymsError.message}`);
    if (gymWideError) throw new Error(`Failed to load gym-wide resets: ${gymWideError.message}`);

    const gymWideByGym = new Map<string, Reset[]>();
    for (const row of gymWideData ?? []) {
      const list = gymWideByGym.get(row.gym_id) ?? [];
      list.push({
        id: row.id,
        reset_on: row.reset_on,
        notes: row.notes,
        boulders_reset: row.boulders_reset,
      });
      gymWideByGym.set(row.gym_id, list);
    }

    return (gymsData ?? []).map((gym) => ({
      ...gym,
      sections: gym.sections ?? [],
      gymWideResets: gymWideByGym.get(gym.id) ?? [],
    })) as GymWithSections[];
  },
  ["active-gyms-with-sections"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);
