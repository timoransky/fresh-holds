import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function getCurrentUser() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getAuthedClient() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user, userId: user.id } : null;
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
