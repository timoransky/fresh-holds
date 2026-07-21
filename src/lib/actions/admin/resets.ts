"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { ISO_DATE_RE, todayISO } from "@/lib/date";

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
    if (sectionIds.length > 1) {
      // A count belongs to one reset row; applying it across N rows would
      // multiply the fresh-boulder total. Force a single-section submission.
      return fail("Boulder count can only be attached when one section is selected");
    }
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

  revalidatePath("/admin");
  revalidateTag("gyms", { expire: 0 });
  return ok(`Logged ${sectionIds.length} section reset${sectionIds.length > 1 ? "s" : ""}`);
}

export type UpdateResetDateResult = ActionResult;

export async function updateResetDate(
  prevState: UpdateResetDateResult,
  formData: FormData,
): Promise<UpdateResetDateResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return fail(ctx.error);

  const resetId = String(formData.get("reset_id") ?? "");
  if (!resetId) return fail("Missing reset id");

  const resetOn = String(formData.get("reset_on") ?? "");
  if (!ISO_DATE_RE.test(resetOn)) return fail("Pick a valid date.");
  if (resetOn > todayISO()) return fail("Reset date can't be in the future.");

  const { error } = await ctx.supabase
    .from("resets")
    .update({ reset_on: resetOn })
    .eq("id", resetId);

  if (error) return fail(error.message);

  revalidatePath("/admin");
  revalidateTag("gyms", { expire: 0 });
  return ok("Reset date updated");
}
