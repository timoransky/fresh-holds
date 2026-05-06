import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { GymWithSections } from "@/lib/types";

export async function getActiveGymsWithSections(): Promise<GymWithSections[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const cutoffISO = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("gyms")
    .select(
      `
      id, slug, name, neighborhood, website_url, instagram_handle, city_id,
      freshness_mode,
      sections!inner (
        id, name, display_order, is_active,
        resets ( id, reset_on, notes, boulders_reset )
      )
    `,
    )
    .eq("is_active", true)
    .eq("sections.is_active", true)
    .gte("sections.resets.reset_on", cutoffISO)
    .lte("sections.resets.reset_on", todayISO)
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
}
