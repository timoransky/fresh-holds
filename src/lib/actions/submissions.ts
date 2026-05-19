"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/auth";
import { fail, okWithData, type ActionResult } from "@/lib/actions/result";
import { ISO_DATE_RE, todayISO } from "@/lib/date";

export type SuggestResetResult = ActionResult<{ submissionId: string }>;

// Vercel hobby caps function bodies at ~4.5 MB. Leave headroom for the rest
// of the multipart payload and let next.config.ts's bodySizeLimit reject
// anything over that before it reaches this action.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_BUCKET = "reset-photos";

export async function suggestReset(
  prevState: SuggestResetResult,
  formData: FormData,
): Promise<SuggestResetResult> {
  const ctx = await getAuthedClient();
  if (!ctx) return fail("Sign in to suggest a reset.");

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

  const photoFile =
    photoEntry instanceof File && photoEntry.size > 0 ? photoEntry : null;

  if (photoFile) {
    if (photoFile.size > MAX_PHOTO_BYTES) {
      return fail("Photo is too big (max 4 MB).");
    }
    if (!photoFile.type.startsWith("image/")) {
      return fail("Photo must be an image.");
    }
  }

  let photoPath: string | null = null;
  if (photoFile) {
    const ext =
      photoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    photoPath = `submissions/${ctx.userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await ctx.supabase.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photoFile, {
        contentType: photoFile.type,
        upsert: false,
      });

    if (uploadError) {
      return fail("Couldn't upload photo. Try again.");
    }
  }

  const { data, error } = await ctx.supabase
    .from("reset_submissions")
    .insert({
      section_id: sectionId,
      reset_on: resetOn,
      notes,
      boulders_reset: bouldersReset,
      submitted_by: ctx.userId,
      photo_path: photoPath,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Don't strand an orphan in storage when the insert is rejected.
    if (photoPath) {
      await ctx.supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
    }
    if (error?.code === "42501" || error?.message?.includes("policy")) {
      return fail("You already have 5 pending suggestions. Wait for admin review.");
    }
    return fail(error?.message ?? "Couldn't submit.");
  }

  revalidatePath("/profile");
  return okWithData({ submissionId: data.id });
}
