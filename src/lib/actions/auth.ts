"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type RequestOtpState =
  | { error: string }
  | { sent: true; email: string }
  | null;

export async function requestOtpCode(
  prevState: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return { error: error.message };
  }

  return { sent: true, email };
}

export type VerifyOtpState = { error: string } | null;

export async function verifyOtpCode(
  prevState: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "/");

  if (!email || !token) {
    return { error: "Enter the 8-digit code from your email." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/");
}
