"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type SubmitState =
  | { error: string }
  | { success: true; submissionId: string }
  | null;

export async function suggestReset(
  prevState: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to suggest a reset." };

  const sectionId = String(formData.get("section_id") ?? "");
  const resetOn = String(formData.get("reset_on") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const bouldersResetRaw = String(formData.get("boulders_reset") ?? "").trim();

  if (!sectionId) return { error: "Pick a sector." };
  if (!ISO_DATE.test(resetOn)) return { error: "Pick a valid date." };

  const today = new Date().toISOString().slice(0, 10);
  if (resetOn > today) return { error: "Reset date can't be in the future." };

  let bouldersReset: number | null = null;
  if (bouldersResetRaw !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Number of boulders must be a positive whole number." };
    }
    bouldersReset = parsed;
  }

  const { data, error } = await supabase
    .from("reset_submissions")
    .insert({
      section_id: sectionId,
      reset_on: resetOn,
      notes,
      boulders_reset: bouldersReset,
      submitted_by: user.id,
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

type ReviewState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return { error: "Access denied" as const };

  return { supabase, user };
}

export async function approveSubmission(
  prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };

  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return { error: "Missing submission id" };

  const { data: submission, error: readError } = await ctx.supabase
    .from("reset_submissions")
    .select("id, section_id, reset_on, notes, boulders_reset, status")
    .eq("id", submissionId)
    .single();

  if (readError || !submission) return { error: "Submission not found" };
  if (submission.status !== "pending") return { error: "Already reviewed" };

  const { data: inserted, error: insertError } = await ctx.supabase
    .from("resets")
    .insert({
      section_id: submission.section_id,
      reset_on: submission.reset_on,
      notes: submission.notes,
      boulders_reset: submission.boulders_reset,
      logged_by: ctx.user.email,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Couldn't create reset" };
  }

  const { error: updateError } = await ctx.supabase
    .from("reset_submissions")
    .update({
      status: "approved",
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      reset_id: inserted.id,
    })
    .eq("id", submissionId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: "Approved" };
}

export async function rejectSubmission(
  prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };

  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return { error: "Missing submission id" };

  const { error } = await ctx.supabase
    .from("reset_submissions")
    .update({
      status: "rejected",
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/admin/submissions");
  return { success: "Rejected" };
}
