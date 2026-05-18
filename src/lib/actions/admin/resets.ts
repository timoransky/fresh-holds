"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

export type SubmitResetResult = ActionResult;

export async function submitReset(
  prevState: SubmitResetResult,
  formData: FormData,
): Promise<SubmitResetResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return fail(ctx.error);

  const gymId = String(formData.get("gym_id") ?? "");
  const sectionIds = formData.getAll("section_ids") as string[];
  const gymWide = formData.get("gym_wide") === "on";
  const resetOn = formData.get("reset_on") as string;
  const notes = (formData.get("notes") as string) || null;
  const bouldersResetRaw = formData.get("boulders_reset") as string | null;

  if (!gymId) {
    return fail("Pick a gym");
  }
  if (!gymWide && sectionIds.length === 0) {
    return fail("Pick at least one section or check 'across the gym'");
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

  const inserts: Array<{
    gym_id: string;
    section_id: string | null;
    reset_on: string;
    notes: string | null;
    logged_by: string | null;
    boulders_reset: number | null;
  }> = sectionIds.map((section_id) => ({
    gym_id: gymId,
    section_id,
    reset_on: resetOn,
    notes,
    logged_by: ctx.user.email ?? null,
    boulders_reset: bouldersReset,
  }));

  if (gymWide) {
    inserts.push({
      gym_id: gymId,
      section_id: null,
      reset_on: resetOn,
      notes,
      logged_by: ctx.user.email ?? null,
      boulders_reset: bouldersReset,
    });
  }

  const { error } = await ctx.supabase.from("resets").insert(inserts);

  if (error) {
    return fail(error.message);
  }

  revalidateTag("gyms", "max");
  const total = inserts.length;
  return ok(`Logged ${total} reset${total > 1 ? "s" : ""}`);
}
