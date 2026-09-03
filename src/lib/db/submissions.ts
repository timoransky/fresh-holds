import "server-only";

import { getAuthedClient, getSupabase } from "@/lib/auth";

export type SubmissionStatus = "pending" | "approved" | "rejected";

// Null for a human suggestion — only the Instagram-stories bot rates its own
// certainty, and it files everything plausible rather than gating (ADR-0006).
export type SubmissionConfidence = "low" | "medium" | "high";

export type PendingSubmission = {
  id: string;
  reset_on: string;
  notes: string | null;
  boulders_reset: number | null;
  created_at: string;
  submitter_email: string;
  // Null when the source didn't name a sector; the admin picks one on approval.
  section_id: string | null;
  section_name: string | null;
  gym_id: string;
  gym_name: string;
  gym_slug: string;
  confidence: SubmissionConfidence | null;
  photo_url: string | null;
};

const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

export type MySubmission = {
  id: string;
  reset_on: string;
  status: SubmissionStatus;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  boulders_reset: number | null;
  section_name: string | null;
  gym_name: string;
};

export async function listPendingSubmissions(): Promise<PendingSubmission[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("reset_submissions")
    .select(
      "id, reset_on, notes, boulders_reset, created_at, section_id, gym_id, confidence, photo_path, sections(name), gyms(name, slug), profiles!submitted_by(email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) console.error("[listPendingSubmissions]", error);
  if (error || !data) return [];

  const paths = data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.photo_path as string | null)
    .filter((p): p is string => !!p);

  const signedUrls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("reset-photos")
      .createSignedUrls(paths, PHOTO_SIGNED_URL_TTL_SECONDS);
    if (signError) console.error("[listPendingSubmissions] createSignedUrls", signError);
    signed?.forEach((s) => {
      if (s.error) console.error("[listPendingSubmissions] signed url item", s.path, s.error);
      if (s.path && s.signedUrl) signedUrls.set(s.path, s.signedUrl);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id,
    reset_on: row.reset_on,
    notes: row.notes,
    boulders_reset: row.boulders_reset ?? null,
    created_at: row.created_at,
    submitter_email: row.profiles?.email ?? "unknown",
    section_id: row.section_id ?? null,
    section_name: row.sections?.name ?? null,
    gym_id: row.gym_id,
    gym_name: row.gyms?.name ?? "",
    gym_slug: row.gyms?.slug ?? "",
    confidence: row.confidence ?? null,
    photo_url: row.photo_path ? signedUrls.get(row.photo_path) ?? null : null,
  }));
}

export async function listMySubmissions(): Promise<MySubmission[]> {
  const ctx = await getAuthedClient();
  if (!ctx) return [];

  const { data, error } = await ctx.supabase
    .from("reset_submissions")
    .select(
      "id, reset_on, status, created_at, reviewed_at, notes, boulders_reset, sections(name), gyms(name)",
    )
    .eq("submitted_by", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id,
    reset_on: row.reset_on,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    notes: row.notes,
    boulders_reset: row.boulders_reset ?? null,
    section_name: row.sections?.name ?? null,
    gym_name: row.gyms?.name ?? "",
  }));
}
