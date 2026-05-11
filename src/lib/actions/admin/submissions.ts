"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

export type ReviewResult = ActionResult;

export async function approveSubmission(
  prevState: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return fail(ctx.error);

  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return fail("Missing submission id");

  const { data: submission, error: readError } = await ctx.supabase
    .from("reset_submissions")
    .select("id, section_id, reset_on, notes, boulders_reset, status")
    .eq("id", submissionId)
    .single();

  if (readError || !submission) return fail("Submission not found");
  if (submission.status !== "pending") return fail("Already reviewed");

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
    return fail(insertError?.message ?? "Couldn't create reset");
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

  if (updateError) return fail(updateError.message);

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok("Approved");
}

export async function rejectSubmission(
  prevState: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return fail(ctx.error);

  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return fail("Missing submission id");

  const { error } = await ctx.supabase
    .from("reset_submissions")
    .update({
      status: "rejected",
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("status", "pending");

  if (error) return fail(error.message);

  revalidatePath("/admin/submissions");
  return ok("Rejected");
}
