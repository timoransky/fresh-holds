"use server";

import { revalidatePath } from "next/cache";
import { ensureAuthedClient } from "@/lib/auth";
import { ISO_DATE_RE } from "@/lib/date";

export async function setVisitsForGym(gymSlug: string, dates: string[]): Promise<void> {
  if (!gymSlug) return;

  // Lazy-create an anonymous Supabase user on first write so bots and
  // one-time visitors don't pollute auth.users. Throws if anon sign-in
  // is misconfigured — we surface that to the caller instead of silently
  // dropping the write.
  const ctx = await ensureAuthedClient();

  const clean = [...new Set(dates.filter((d) => ISO_DATE_RE.test(d)))];

  const { error: deleteError } = await ctx.supabase
    .from("visits")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("gym_slug", gymSlug);
  if (deleteError) {
    throw new Error(`Failed to clear visits: ${deleteError.message}`);
  }

  if (clean.length > 0) {
    const { error: insertError } = await ctx.supabase.from("visits").insert(
      clean.map((date) => ({
        user_id: ctx.userId,
        gym_slug: gymSlug,
        visited_on: date,
      })),
    );
    if (insertError) {
      throw new Error(`Failed to save visits: ${insertError.message}`);
    }
  }

  // Make sure the next page render re-fetches visits so the SSR'd order
  // reflects the new visit.
  revalidatePath("/");
}
