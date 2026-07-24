import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { resetSubmissions } from "@/db/schema";
import { getAuthedUser, getSupabase, requireAdmin } from "@/lib/auth";

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

const PHOTO_BUCKET = "reset-photos";
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
  const ctx = await requireAdmin();
  if ("error" in ctx) return [];

  const rows = await db.query.resetSubmissions.findMany({
    columns: {
      id: true,
      reset_on: true,
      notes: true,
      boulders_reset: true,
      created_at: true,
      section_id: true,
      photo_path: true,
    },
    where: eq(resetSubmissions.status, "pending"),
    orderBy: [asc(resetSubmissions.created_at)],
    with: {
      section: { columns: { name: true }, with: { gym: { columns: { name: true, slug: true } } } },
      submitter: { columns: { email: true } },
    },
  });

  // Signed URLs stay on supabase-js until Phase 2 (the bucket lives on in the
  // Supabase project). The admin read policy on storage.objects covers this.
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  const signedUrls = new Map<string, string>();
  if (paths.length > 0) {
    const supabase = await getSupabase();
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, PHOTO_SIGNED_URL_TTL_SECONDS);
    if (signError) console.error("[listPendingSubmissions] createSignedUrls", signError);
    signed?.forEach((s) => {
      if (s.error) console.error("[listPendingSubmissions] signed url item", s.path, s.error);
      if (s.path && s.signedUrl) signedUrls.set(s.path, s.signedUrl);
    });
  }

  return rows.map((row) => ({
    id: row.id,
    reset_on: row.reset_on,
    notes: row.notes,
    boulders_reset: row.boulders_reset ?? null,
    created_at: row.created_at,
    submitter_email: row.submitter?.email ?? "unknown",
    section_id: row.section_id,
    section_name: row.section?.name ?? "",
    gym_name: row.section?.gym?.name ?? "",
    gym_slug: row.section?.gym?.slug ?? "",
    photo_url: row.photo_path ? (signedUrls.get(row.photo_path) ?? null) : null,
  }));
}

export async function listMySubmissions(): Promise<MySubmission[]> {
  const authed = await getAuthedUser();
  if (!authed) return [];

  // Scoped to the caller (matches the "own submissions read" policy).
  const rows = await db.query.resetSubmissions.findMany({
    columns: {
      id: true,
      reset_on: true,
      status: true,
      created_at: true,
      reviewed_at: true,
      notes: true,
      boulders_reset: true,
    },
    where: eq(resetSubmissions.submitted_by, authed.userId),
    orderBy: [desc(resetSubmissions.created_at)],
    limit: 20,
    with: {
      section: { columns: { name: true }, with: { gym: { columns: { name: true } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    reset_on: row.reset_on,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    notes: row.notes,
    boulders_reset: row.boulders_reset ?? null,
    section_name: row.section?.name ?? "",
    gym_name: row.section?.gym?.name ?? "",
  }));
}
