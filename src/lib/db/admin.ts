import { asc, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { gyms, resets } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
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
  const ctx = await requireAdmin();
  if ("error" in ctx) throw new Error(ctx.error);

  // gyms/sections are public-read; the admin gate above is the UX layer.
  const rows = await db.query.gyms.findMany({
    columns: { id: true, name: true, slug: true },
    where: (g, { eq }) => eq(g.is_active, true),
    orderBy: [asc(gyms.display_order)],
    with: {
      sections: {
        columns: { id: true, name: true, display_order: true, is_active: true },
        orderBy: (s, { asc: ascOrder }) => [ascOrder(s.display_order)],
      },
    },
  });

  return rows.map((gym) => ({
    id: gym.id,
    name: gym.name,
    slug: gym.slug,
    sections: gym.sections
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name, display_order: s.display_order })),
  }));
}

export async function getRecentResets({
  limit = 30,
  sortBy = "reset_on",
}: { limit?: number; sortBy?: RecentResetSortKey } = {}): Promise<RecentReset[]> {
  const ctx = await requireAdmin();
  if ("error" in ctx) throw new Error(ctx.error);

  // Always fetch by reset_on desc so `limit` selects the latest entries; we
  // re-sort in JS when the caller wants a different presentation order.
  const data = await db.query.resets.findMany({
    columns: {
      id: true,
      reset_on: true,
      created_at: true,
      notes: true,
      logged_by: true,
      boulders_reset: true,
    },
    orderBy: [desc(resets.reset_on), desc(resets.created_at)],
    limit,
    with: {
      section: {
        columns: { name: true },
        with: { gym: { columns: { name: true } } },
      },
    },
  });

  const rows: RecentReset[] = data.map((r) => ({
    id: r.id,
    reset_on: r.reset_on,
    created_at: r.created_at,
    notes: r.notes,
    logged_by: r.logged_by,
    boulders_reset: r.boulders_reset ?? null,
    section_name: r.section?.name ?? "",
    gym_name: r.section?.gym?.name ?? "",
  }));

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
