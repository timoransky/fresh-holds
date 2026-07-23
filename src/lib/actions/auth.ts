"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/auth";

// OTP send/verify now run on the browser Supabase client (SignInForm) so that
// `onAuthStateChange` fires and AuthListener can refresh the server UI without
// a reload. This server action stays for the full-page admin/profile logout
// forms, which navigate cross-route and re-render regardless.
export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
