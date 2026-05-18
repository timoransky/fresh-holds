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
  section_id: string | null;
  section_name: string | null;
  gym_id: string;
  gym_name: string;
  gym_slug: string;
};

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
      "id, reset_on, notes, boulders_reset, created_at, section_id, gym_id, sections(name), gyms(name, slug), profiles(email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

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
