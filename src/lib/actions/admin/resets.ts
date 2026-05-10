"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

type ResetState = { error?: string; success?: string } | null;

export async function submitReset(prevState: ResetState, formData: FormData): Promise<ResetState> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };

  const sectionIds = formData.getAll("section_ids") as string[];
  const resetOn = formData.get("reset_on") as string;
  const notes = (formData.get("notes") as string) || null;
  const bouldersResetRaw = formData.get("boulders_reset") as string | null;

  if (!sectionIds.length) {
    return { error: "Select at least one section" };
  }

  if (!resetOn) {
    return { error: "Reset date is required" };
  }

  let bouldersReset: number | null = null;
  if (bouldersResetRaw && bouldersResetRaw.trim() !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Boulders reset must be a positive integer" };
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
    return { error: error.message };
  }

  revalidatePath("/");
  return {
    success: `Logged ${sectionIds.length} section reset${sectionIds.length > 1 ? "s" : ""}`,
  };
}
