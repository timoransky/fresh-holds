"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/auth";
import { fail, okWithData, type ActionResult } from "@/lib/actions/result";

export type RequestOtpResult = ActionResult<{ email: string }>;

export async function requestOtpCode(
  prevState: RequestOtpResult,
  formData: FormData,
): Promise<RequestOtpResult> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return fail("Enter your email.");
  }

  const supabase = await getSupabase();

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return fail(error.message);
  }

  return okWithData({ email });
}

export type VerifyOtpResult = ActionResult;

export async function verifyOtpCode(
  prevState: VerifyOtpResult,
  formData: FormData,
): Promise<VerifyOtpResult> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "/");

  if (!email || !token) {
    return fail("Enter the 8-digit code from your email.");
  }

  const supabase = await getSupabase();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return fail(error.message);
  }

  // Auth state changed — without this, the redirect reuses the client
  // router's pre-login copy of the destination (stale header, GymList
  // stuck on authed=false behind the login modal).
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
