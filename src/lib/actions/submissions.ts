"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db, rlsDb } from "@/db/client";
import { resetSubmissions } from "@/db/schema";
import { getAuthedUser, getSupabase } from "@/lib/auth";
import { fail, okWithData, type ActionResult } from "@/lib/actions/result";
import { ISO_DATE_RE, todayISO } from "@/lib/date";

export type SuggestResetResult = ActionResult<{ submissionId: string }>;

// Vercel hobby caps function bodies at ~4.5 MB. Leave headroom for the rest
// of the multipart payload and let next.config.ts's bodySizeLimit reject
// anything over that before it reaches this action.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_BUCKET = "reset-photos";
const PENDING_SUBMISSION_CAP = 5;

export async function suggestReset(
  prevState: SuggestResetResult,
  formData: FormData,
): Promise<SuggestResetResult> {
  const authed = await getAuthedUser();
  if (!authed) return fail("Sign in to suggest a reset.");

  const sectionId = String(formData.get("section_id") ?? "");
  const resetOn = String(formData.get("reset_on") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const bouldersResetRaw = String(formData.get("boulders_reset") ?? "").trim();
  const photoEntry = formData.get("photo");

  if (!sectionId) return fail("Pick a sector.");
  if (!ISO_DATE_RE.test(resetOn)) return fail("Pick a valid date.");

  if (resetOn > todayISO()) return fail("Reset date can't be in the future.");

  let bouldersReset: number | null = null;
  if (bouldersResetRaw !== "") {
    const parsed = Number(bouldersResetRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fail("Number of boulders must be a positive whole number.");
    }
    bouldersReset = parsed;
  }

  // UX-layer pending cap: give a friendly message before RLS's cap policy
  // rejects the insert (the policy is still the backstop below).
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(resetSubmissions)
    .where(
      and(eq(resetSubmissions.submitted_by, authed.userId), eq(resetSubmissions.status, "pending")),
    );
  if (pending >= PENDING_SUBMISSION_CAP) {
    return fail("You already have 5 pending suggestions. Wait for admin review.");
  }

  const photoFile = photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

  if (photoFile) {
    if (photoFile.size > MAX_PHOTO_BYTES) {
      return fail("Photo is too big (max 4 MB).");
    }
    if (!photoFile.type.startsWith("image/")) {
      return fail("Photo must be an image.");
    }
  }

  // Storage stays on supabase-js until Phase 2.
  let photoPath: string | null = null;
  if (photoFile) {
    const ext =
      photoFile.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
    photoPath = `submissions/${authed.userId}/${crypto.randomUUID()}.${ext}`;

    const supabase = await getSupabase();
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });

    if (uploadError) {
      console.error("[suggestReset] photo upload failed", uploadError);
      return fail(`Couldn't upload photo: ${uploadError.message}`);
    }
  }

  let submissionId: string;
  try {
    const inserted = await rlsDb(authed.claims, (tx) =>
      tx
        .insert(resetSubmissions)
        .values({
          section_id: sectionId,
          reset_on: resetOn,
          notes,
          boulders_reset: bouldersReset,
          submitted_by: authed.userId,
          photo_path: photoPath,
        })
        .returning({ id: resetSubmissions.id }),
    );
    submissionId = inserted[0].id;
  } catch (error) {
    // Don't strand an orphan in storage when the insert is rejected.
    if (photoPath) {
      const supabase = await getSupabase();
      await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
    }
    console.error("[suggestReset] insert failed", error);
    // 42501 = insufficient_privilege: the RLS cap policy rejected it.
    if (isRlsViolation(error)) {
      return fail("You already have 5 pending suggestions. Wait for admin review.");
    }
    return fail(error instanceof Error ? error.message : "Couldn't submit.");
  }

  revalidatePath("/profile");
  return okWithData({ submissionId });
}

function isRlsViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42501";
}
