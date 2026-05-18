import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/utils/supabase/server";
import { isoFromDate, todayISO } from "@/lib/date";
import type { Gym, GymWithResets, Reset, Section } from "@/lib/types";

export type GymWithSectionCatalog = Gym & {
  sections: Pick<Section, "id" | "name" | "display_order">[];
};

// Resets older than this are excluded — keeps the homepage payload focused on
// actionable freshness data. Tune if users start asking about older sessions.
const RESET_HISTORY_DAYS = 240;
const DAY_MS = 24 * 60 * 60 * 1000;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export const getActiveGymsWithResets = unstable_cache(
  async (): Promise<GymWithResets[]> => {
    const supabase = createAnonClient();

    const cutoffISO = isoFromDate(new Date(Date.now() - RESET_HISTORY_DAYS * DAY_MS));
    const todayStr = todayISO();

    const gymsPromise = supabase
      .from("gyms")
      .select("id, slug, name, neighborhood, website_url, instagram_handle, city_id")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Every reset row, joined to its (optional) section's name. section_id /
    // section_name are null for gym-wide resets.
    const resetsPromise = supabase
      .from("resets")
      .select("id, gym_id, reset_on, notes, boulders_reset, section_id, sections(name)")
      .gte("reset_on", cutoffISO)
      .lte("reset_on", todayStr)
      .order("reset_on", { ascending: false });

    const [{ data: gymsData, error: gymsError }, { data: resetsData, error: resetsError }] =
      await Promise.all([gymsPromise, resetsPromise]);

    if (gymsError) throw new Error(`Failed to load gyms: ${gymsError.message}`);
    if (resetsError) throw new Error(`Failed to load resets: ${resetsError.message}`);

    const resetsByGym = new Map<string, Reset[]>();
    for (const row of resetsData ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sectionName = ((row as any).sections?.name as string | undefined) ?? null;
      const list = resetsByGym.get(row.gym_id) ?? [];
      list.push({
        id: row.id,
        reset_on: row.reset_on,
        notes: row.notes,
        boulders_reset: row.boulders_reset,
        section_id: row.section_id,
        section_name: sectionName,
      });
      resetsByGym.set(row.gym_id, list);
    }

    return (gymsData ?? []).map((gym) => ({
      ...gym,
      resets: resetsByGym.get(gym.id) ?? [],
    })) as GymWithResets[];
  },
  ["active-gyms-with-resets"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);

// Sector catalog per gym — used by the suggest/admin forms to populate the
// sector selector. Separate from the homepage loader because forms don't
// need reset history and the homepage doesn't need the section list.
export const getGymsWithSectionCatalog = unstable_cache(
  async (): Promise<GymWithSectionCatalog[]> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("gyms")
      .select(
        "id, slug, name, neighborhood, website_url, instagram_handle, city_id, sections(id, name, display_order, is_active)",
      )
      .eq("is_active", true)
      .eq("sections.is_active", true)
      .order("display_order", { ascending: true })
      .order("display_order", { referencedTable: "sections", ascending: true });

    if (error) throw new Error(`Failed to load gym sections: ${error.message}`);

    return (data ?? []).map((gym) => ({
      id: gym.id,
      slug: gym.slug,
      name: gym.name,
      neighborhood: gym.neighborhood,
      website_url: gym.website_url,
      instagram_handle: gym.instagram_handle,
      city_id: gym.city_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sections: ((gym.sections ?? []) as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        display_order: s.display_order,
      })),
    }));
  },
  ["gyms-with-section-catalog"],
  { tags: ["gyms"], revalidate: ONE_DAY_SECONDS },
);
