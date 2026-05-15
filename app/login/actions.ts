"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { ok: true };

export async function sendOtp(phone: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function verifyOtp(
  phone: string,
  token: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) return { error: error.message };
  return { ok: true };
}
