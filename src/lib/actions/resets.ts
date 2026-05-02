"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

type ResetState = { error?: string; success?: string } | null;

export async function submitReset(prevState: ResetState, formData: FormData): Promise<ResetState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Access denied" };
  }

  const sectionIds = formData.getAll("section_ids") as string[];
  const resetOn = formData.get("reset_on") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!sectionIds.length) {
    return { error: "Select at least one section" };
  }

  if (!resetOn) {
    return { error: "Reset date is required" };
  }

  const inserts = sectionIds.map((section_id) => ({
    section_id,
    reset_on: resetOn,
    notes,
    logged_by: user.email,
  }));

  const { error } = await supabase.from("resets").insert(inserts);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {
    success: `Logged ${sectionIds.length} section reset${sectionIds.length > 1 ? "s" : ""}`,
  };
}
