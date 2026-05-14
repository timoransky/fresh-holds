"use server";

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

  // If the visitor is already signed in anonymously, attach the email to
  // the existing user instead of minting a new one. That preserves the
  // anon visits the user has logged so far.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = user?.is_anonymous
    ? await supabase.auth.updateUser({ email })
    : await supabase.auth.signInWithOtp({ email });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous users verify an email_change (issued via updateUser); fully-
  // unauthenticated callers verify a regular email sign-in OTP.
  const { error } = await supabase.auth.verifyOtp(
    user?.is_anonymous
      ? { email, token, type: "email_change" }
      : { email, token, type: "email" },
  );

  if (error) {
    return fail(error.message);
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
