"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { rlsDb } from "@/db/client";
import { resetSubmissions } from "@/db/schema";
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

  const loggedBy = ctx.user.email ?? null;

  // One statement: read the pending submission, copy it into resets, and stamp
  // the submission approved — atomically. If the submission isn't pending, the
  // `sub` CTE is empty, nothing is inserted/updated, and RETURNING yields zero
  // rows ⇒ "Already reviewed". Runs under the admin's RLS claims.
  let approved: { id: string }[];
  try {
    approved = await rlsDb(ctx.claims, async (tx) => {
      const result = await tx.execute<{ id: string }>(sql`
        with sub as (
          select id, section_id, reset_on, notes, boulders_reset
          from reset_submissions
          where id = ${submissionId} and status = 'pending'
        ),
        new_reset as (
          insert into resets (section_id, reset_on, notes, boulders_reset, logged_by)
          select section_id, reset_on, notes, boulders_reset, ${loggedBy}::text from sub
          returning id
        )
        update reset_submissions rs
        set status = 'approved',
            reviewed_by = ${ctx.userId}::uuid,
            reviewed_at = now(),
            reset_id = (select id from new_reset)
        from sub
        where rs.id = sub.id
        returning rs.id
      `);
      return result.rows;
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Couldn't approve submission");
  }

  if (approved.length === 0) return fail("Already reviewed");

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidateTag("gyms", { expire: 0 });
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

  try {
    await rlsDb(ctx.claims, (tx) =>
      tx
        .update(resetSubmissions)
        .set({
          status: "rejected",
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
        })
        .where(and(eq(resetSubmissions.id, submissionId), eq(resetSubmissions.status, "pending"))),
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Couldn't reject submission");
  }

  revalidatePath("/admin/submissions");
  return ok("Rejected");
}
