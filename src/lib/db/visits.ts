import { cache } from "react";
import { getAuthedClient } from "@/lib/auth";
import type { VisitHistory } from "@/lib/types";

export const pullMyVisits = cache(async (): Promise<VisitHistory> => {
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
});
