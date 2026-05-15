"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

export type SubmitResetResult = ActionResult;

export async function submitReset(
  prevState: SubmitResetResult,
  formData: FormData,
): Promise<SubmitResetResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return fail(ctx.error);

  const sectionIds = formData.getAll("section_ids") as string[];
  const resetOn = formData.get("reset_on") as string;
  const notes = (formData.get("notes") as string) || null;
  const bouldersResetRaw = formData.get("boulders_reset") as string | null;

  if (!sectionIds.length) {
    return fail("Select at least one section");
  }

  if (!resetOn) {
    return fail("Reset date is required");
  }

  let bouldersReset: number | null = null;
  if (bouldersResetRaw && bouldersResetRaw.trim() !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fail("Boulders reset must be a positive integer");
    }
    bouldersReset = parsed;
  }

  const inserts = sectionIds.map((section_id) => ({
    section_id,
    reset_on: resetOn,
    notes,
    logged_by: ctx.user.email,
    boulders_reset: bouldersReset,
  }));

  const { error } = await ctx.supabase.from("resets").insert(inserts);

  if (error) {
    return fail(error.message);
  }

  updateTag("gyms");
  // Re-prime the cache so the first user lands on a warm read instead of
  // paying the full Supabase JOIN inside the home page's dynamic segment.
  await getActiveGymsWithSections();
  return ok(`Logged ${sectionIds.length} section reset${sectionIds.length > 1 ? "s" : ""}`);
}
