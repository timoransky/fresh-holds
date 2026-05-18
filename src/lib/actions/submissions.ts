"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/auth";
import { fail, okWithData, type ActionResult } from "@/lib/actions/result";
import { ISO_DATE_RE, todayISO } from "@/lib/date";
import { GYM_WIDE_VALUE } from "@/lib/actions/submissions-constants";

export type SuggestResetResult = ActionResult<{ submissionId: string }>;

export async function suggestReset(
  prevState: SuggestResetResult,
  formData: FormData,
): Promise<SuggestResetResult> {
  const ctx = await getAuthedClient();
  if (!ctx) return fail("Sign in to suggest a reset.");

  const gymId = String(formData.get("gym_id") ?? "");
  const sectionChoice = String(formData.get("section_id") ?? "");
  const resetOn = String(formData.get("reset_on") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const bouldersResetRaw = String(formData.get("boulders_reset") ?? "").trim();

  if (!gymId) return fail("Pick a gym.");
  if (!sectionChoice) return fail("Pick a sector or 'across the gym'.");
  if (!ISO_DATE_RE.test(resetOn)) return fail("Pick a valid date.");

  if (resetOn > todayISO()) return fail("Reset date can't be in the future.");

  const sectionId = sectionChoice === GYM_WIDE_VALUE ? null : sectionChoice;

  let bouldersReset: number | null = null;
  if (bouldersResetRaw !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fail("Number of boulders must be a positive whole number.");
    }
    bouldersReset = parsed;
  }

  const { data, error } = await ctx.supabase
    .from("reset_submissions")
    .insert({
      gym_id: gymId,
      section_id: sectionId,
      reset_on: resetOn,
      notes,
      boulders_reset: bouldersReset,
      submitted_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501" || error?.message?.includes("policy")) {
      return fail("You already have 5 pending suggestions. Wait for admin review.");
    }
    return fail(error?.message ?? "Couldn't submit.");
  }

  revalidatePath("/profile");
  return okWithData({ submissionId: data.id });
}
