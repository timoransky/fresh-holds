"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

type ReviewState = { error?: string; success?: string } | null;

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
