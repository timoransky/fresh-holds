"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/auth";
import { ISO_DATE_RE, todayISO } from "@/lib/date";

type SubmitState =
  | { error: string }
  | { success: true; submissionId: string }
  | null;

export async function suggestReset(
  prevState: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const ctx = await getAuthedClient();
  if (!ctx) return { error: "Sign in to suggest a reset." };

  const sectionId = String(formData.get("section_id") ?? "");
  const resetOn = String(formData.get("reset_on") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const bouldersResetRaw = String(formData.get("boulders_reset") ?? "").trim();

  if (!sectionId) return { error: "Pick a sector." };
  if (!ISO_DATE_RE.test(resetOn)) return { error: "Pick a valid date." };

  if (resetOn > todayISO()) return { error: "Reset date can't be in the future." };

  let bouldersReset: number | null = null;
  if (bouldersResetRaw !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Number of boulders must be a positive whole number." };
    }
    bouldersReset = parsed;
  }

  const { data, error } = await ctx.supabase
    .from("reset_submissions")
    .insert({
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
      return { error: "You already have 5 pending suggestions. Wait for admin review." };
    }
    return { error: error?.message ?? "Couldn't submit." };
  }

  revalidatePath("/profile");
  return { success: true, submissionId: data.id };
}
