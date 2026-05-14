import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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

export async function getAuthedClient() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user, userId: user.id } : null;
}

// Same shape as getAuthedClient, but if no session exists yet, mints an
// anonymous Supabase user. Use this for write actions that should "just
// work" without an explicit sign-in (e.g. logging a visit). Requires
// Anonymous Sign-Ins enabled in the Supabase project; returns null if it
// can't get a session.
export async function ensureAuthedClient() {
  const ctx = await getAuthedClient();
  if (ctx) return ctx;

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.warn("[auth] anonymous sign-in failed:", error?.message);
    return null;
  }
  return { supabase, user: data.user, userId: data.user.id };
}

export async function isAdmin(): Promise<boolean> {
  const ctx = await getAuthedClient();
  if (!ctx) return false;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", ctx.userId)
    .single();
  return !!profile?.is_admin;
}

export type AuthedContext = NonNullable<Awaited<ReturnType<typeof getAuthedClient>>>;
export type AdminError = { error: "Not authenticated" | "Access denied" };

export async function requireAdmin(): Promise<AuthedContext | AdminError> {
  const ctx = await getAuthedClient();
  if (!ctx) return { error: "Not authenticated" };

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", ctx.userId)
    .single();
  if (!profile?.is_admin) return { error: "Access denied" };

  return ctx;
}
