import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db, type Claims } from "@/db/client";
import { profiles } from "@/db/schema";
import type { User } from "@supabase/supabase-js";

// Auth still runs on Supabase in Phase 1 — only the profiles/data reads moved
// to Drizzle. `getSupabase` remains for the auth calls and (until Phase 2) for
// storage signed URLs.
export async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export type AuthedUser = {
  user: User;
  userId: string;
  claims: Claims;
};

// The single authed entry point for data mutations/reads. Returns the verified
// Supabase user plus the minimal JWT claims that feed `rlsDb`. Also ensures the
// user's profiles row exists — harmless alongside the Supabase trigger today,
// and it takes over the trigger's job once the DB moves to Neon (Phase 3).
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureProfile(user);

  return {
    user,
    userId: user.id,
    claims: { sub: user.id, role: "authenticated" },
  };
}

// Insert-on-conflict-do-nothing so a signed-in user always has a profiles row.
export async function ensureProfile(user: User): Promise<void> {
  await db
    .insert(profiles)
    .values({ id: user.id, email: user.email ?? "" })
    .onConflictDoNothing({ target: profiles.id });
}

async function readIsAdmin(userId: string): Promise<boolean> {
  const row = await db.query.profiles.findFirst({
    columns: { is_admin: true },
    where: eq(profiles.id, userId),
  });
  return !!row?.is_admin;
}

export async function isAdmin(): Promise<boolean> {
  const authed = await getAuthedUser();
  if (!authed) return false;
  return readIsAdmin(authed.userId);
}

export type AdminContext = AuthedUser;
export type AdminError = { error: "Not authenticated" | "Access denied" };

export async function requireAdmin(): Promise<AdminContext | AdminError> {
  const authed = await getAuthedUser();
  if (!authed) return { error: "Not authenticated" };
  if (!(await readIsAdmin(authed.userId))) return { error: "Access denied" };
  return authed;
}
