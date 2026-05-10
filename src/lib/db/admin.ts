import { getSupabase } from "@/lib/auth";

import type { FreshnessMode } from "@/lib/types";

export type AdminSection = {
  id: string;
  name: string;
  display_order: number;
};

export type AdminGym = {
  id: string;
  name: string;
  slug: string;
  freshness_mode: FreshnessMode;
  sections: AdminSection[];
};

export type RecentReset = {
  id: string;
  reset_on: string;
  notes: string | null;
  logged_by: string | null;
  boulders_reset: number | null;
  section_name: string;
  gym_name: string;
};

export async function getGymsForAdmin(): Promise<AdminGym[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("gyms")
    .select(
      "id, name, slug, freshness_mode, sections(id, name, display_order, is_active)",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("display_order", { referencedTable: "sections", ascending: true });

  if (error) {
    throw new Error(`Failed to load gyms: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((gym: any) => ({
    ...gym,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sections: (gym.sections ?? []).filter((s: any) => s.is_active),
  }));
}

export async function getRecentResets(limit = 30): Promise<RecentReset[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("resets")
    .select("id, reset_on, notes, logged_by, boulders_reset, sections(name, gyms(name))")
    .order("reset_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load resets: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    reset_on: r.reset_on,
    notes: r.notes,
    logged_by: r.logged_by,
    boulders_reset: r.boulders_reset ?? null,
    section_name: r.sections?.name ?? "",
    gym_name: r.sections?.gyms?.name ?? "",
  }));
}
