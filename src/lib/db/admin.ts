import { getSupabase } from "@/lib/auth";
import type { RecentResetSortKey } from "@/lib/db/admin-sort";

export type AdminSection = {
  id: string;
  name: string;
  display_order: number;
};

export type AdminGym = {
  id: string;
  name: string;
  slug: string;
  sections: AdminSection[];
};

export type RecentReset = {
  id: string;
  reset_on: string;
  created_at: string;
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
    .select("id, name, slug, sections(id, name, display_order, is_active)")
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

export async function getRecentResets(
  { limit = 30, sortBy = "reset_on" }: { limit?: number; sortBy?: RecentResetSortKey } = {},
): Promise<RecentReset[]> {
  const supabase = await getSupabase();

  // Always fetch by reset_on desc so `limit` selects the latest entries; we
  // re-sort in JS when the caller wants a different presentation order.
  const { data, error } = await supabase
    .from("resets")
    .select("id, reset_on, created_at, notes, logged_by, boulders_reset, sections(name, gyms(name))")
    .order("reset_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load resets: ${error.message}`);
  }

  const rows: RecentReset[] = (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id,
      reset_on: r.reset_on,
      created_at: r.created_at,
      notes: r.notes,
      logged_by: r.logged_by,
      boulders_reset: r.boulders_reset ?? null,
      section_name: r.sections?.name ?? "",
      gym_name: r.sections?.gyms?.name ?? "",
    }),
  );

  if (sortBy === "created_at") {
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else if (sortBy === "gym_name") {
    rows.sort(
      (a, b) =>
        a.gym_name.localeCompare(b.gym_name) ||
        b.reset_on.localeCompare(a.reset_on) ||
        b.created_at.localeCompare(a.created_at),
    );
  }

  return rows;
}
