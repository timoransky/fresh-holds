"use server";

import { getAuthedClient } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";
import type { VisitHistory } from "@/lib/types";

export async function pullMyVisits(): Promise<VisitHistory> {
  const ctx = await getAuthedClient();
  if (!ctx) return {};

  const { data, error } = await ctx.supabase
    .from("visits")
    .select("gym_slug, visited_on")
    .eq("user_id", ctx.userId);
  if (error || !data) return {};

  const history: VisitHistory = {};
  for (const row of data) {
    (history[row.gym_slug] ??= []).push(row.visited_on);
  }
  for (const slug of Object.keys(history)) {
    history[slug] = [...new Set(history[slug])].sort();
  }
  return history;
}

// Additive upsert. Never deletes — safe to call with the client's union of
// (local ∪ remote) on first authed mount. No return value; callers already
// have the data they wrote.
export async function pushMyVisits(history: VisitHistory): Promise<void> {
  const ctx = await getAuthedClient();
  if (!ctx) return;

  const rows: { user_id: string; gym_slug: string; visited_on: string }[] = [];
  for (const [slug, dates] of Object.entries(history)) {
    if (typeof slug !== "string" || !slug) continue;
    for (const date of dates) {
      if (typeof date !== "string" || !ISO_DATE_RE.test(date)) continue;
      rows.push({ user_id: ctx.userId, gym_slug: slug, visited_on: date });
    }
  }

  if (rows.length === 0) return;

  await ctx.supabase.from("visits").upsert(rows, { onConflict: "user_id,gym_slug,visited_on" });
}

export async function setVisitsForGym(gymSlug: string, dates: string[]): Promise<void> {
  const ctx = await getAuthedClient();
  if (!ctx) return;
  if (!gymSlug) return;

  const clean = [...new Set(dates.filter((d) => ISO_DATE_RE.test(d)))];

  await ctx.supabase
    .from("visits")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("gym_slug", gymSlug);

  if (clean.length === 0) return;

  await ctx.supabase.from("visits").insert(
    clean.map((date) => ({
      user_id: ctx.userId,
      gym_slug: gymSlug,
      visited_on: date,
    })),
  );
}
