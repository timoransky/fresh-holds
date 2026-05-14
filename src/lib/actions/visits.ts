"use server";

import { ensureAuthedClient } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";

export async function setVisitsForGym(gymSlug: string, dates: string[]): Promise<void> {
  if (!gymSlug) return;

  // Lazy-create an anonymous Supabase user on first write. This keeps
  // bots and one-time visitors out of auth.users — only people who
  // actually interact get an identity.
  const ctx = await ensureAuthedClient();
  if (!ctx) return;

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
