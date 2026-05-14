"use server";

import { getAuthedClient } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";

export async function setVisitsForGym(gymSlug: string, dates: string[]): Promise<void> {
  const ctx = await getAuthedClient();
  if (!ctx) return;
  if (!gymSlug) return;

  const clean = [...new Set(dates.filter((d) => ISO_DATE_RE.test(d)))];

  await ctx.supabase.from("visits").delete().eq("user_id", ctx.userId).eq("gym_slug", gymSlug);

  if (clean.length === 0) return;

  await ctx.supabase.from("visits").insert(
    clean.map((date) => ({
      user_id: ctx.userId,
      gym_slug: gymSlug,
      visited_on: date,
    })),
  );
}
