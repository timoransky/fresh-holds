import "server-only";

import { getAuthedClient, getSupabase } from "@/lib/auth";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type PendingSubmission = {
  id: string;
  reset_on: string;
  notes: string | null;
  boulders_reset: number | null;
  created_at: string;
  submitter_email: string;
  section_id: string;
  section_name: string;
  gym_name: string;
  gym_slug: string;
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
  section_name: string;
  gym_name: string;
};

export async function listPendingSubmissions(): Promise<PendingSubmission[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("reset_submissions")
    .select(
      "id, reset_on, notes, boulders_reset, created_at, section_id, photo_path, sections(name, gyms(name, slug)), profiles(email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const paths = data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.photo_path as string | null)
    .filter((p): p is string => !!p);

  const signedUrls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("reset-photos")
      .createSignedUrls(paths, PHOTO_SIGNED_URL_TTL_SECONDS);
    signed?.forEach((s) => {
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
    section_id: row.section_id,
    section_name: row.sections?.name ?? "",
    gym_name: row.sections?.gyms?.name ?? "",
    gym_slug: row.sections?.gyms?.slug ?? "",
    photo_url: row.photo_path ? signedUrls.get(row.photo_path) ?? null : null,
  }));
}

export async function listMySubmissions(): Promise<MySubmission[]> {
  const ctx = await getAuthedClient();
  if (!ctx) return [];

  const { data, error } = await ctx.supabase
    .from("reset_submissions")
    .select(
      "id, reset_on, status, created_at, reviewed_at, notes, boulders_reset, sections(name, gyms(name))",
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
    section_name: row.sections?.name ?? "",
    gym_name: row.sections?.gyms?.name ?? "",
  }));
}
