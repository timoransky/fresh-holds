"use server";

import { getAuthedClient, getCurrentUser } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";
import type { VisitHistory } from "@/lib/types";

// SSR entry point: returns the user's full visit history when authed, or null
// for anonymous (signals to the client to fall back to localStorage). Runs in
// parallel with the page's other queries.
export async function getInitialVisits(): Promise<VisitHistory | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return pullMyVisits();
}

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

// Additive merge: union the caller's local history into the server, then
// return the unioned history. Never deletes, so it's safe to call on first
// sign-in from a device where localStorage may be partial or empty.
export async function mergeFromLocal(local: VisitHistory): Promise<VisitHistory> {
  const ctx = await getAuthedClient();
  if (!ctx) return local;

  const rows: { user_id: string; gym_slug: string; visited_on: string }[] = [];
  for (const [slug, dates] of Object.entries(local)) {
    if (typeof slug !== "string" || !slug) continue;
    for (const date of dates) {
      if (typeof date !== "string" || !ISO_DATE_RE.test(date)) continue;
      rows.push({ user_id: ctx.userId, gym_slug: slug, visited_on: date });
    }
  }

  if (rows.length > 0) {
    await ctx.supabase.from("visits").upsert(rows, { onConflict: "user_id,gym_slug,visited_on" });
  }

  return pullMyVisits();
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
