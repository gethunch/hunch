"use server";

import { redirect } from "next/navigation";
import {
  applyOnboarding,
  findUserIdByEmail,
  getCurrentUser,
  isUsernameTaken,
} from "@/lib/repository/users";
import { createClient } from "@/lib/supabase/server";
import { isValidAvatarForUser } from "@/lib/avatars";
import { EMAIL_REGEX, USERNAME_REGEX } from "@/lib/identity";
import { siteUrlFor } from "@/lib/site-url";

export type CompleteResult = { error: string } | { ok: true };

function trimString(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function completeOnboarding(
  formData: FormData,
): Promise<CompleteResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  if (me.onboarded) return { error: "Already onboarded" };
  // Defense in depth: username is immutable once set. The onboarded gate
  // above should already cover this (you can't be onboarded without a
  // username), but a second explicit check keeps the invariant from drifting
  // if a future refactor splits the two states.
  if (me.username) return { error: "Username already set" };

  const firstName = trimString(formData.get("firstName"), 40);
  const lastName = trimString(formData.get("lastName"), 40);
  const email = trimString(formData.get("email"), 254);
  const username = trimString(formData.get("username"), 20);
  const avatarUrl = trimString(formData.get("avatarUrl"), 500);

  if (firstName.length < 1) return { error: "First name is required" };
  if (lastName.length < 1) return { error: "Last name is required" };
  if (!EMAIL_REGEX.test(email)) return { error: "Email looks invalid" };
  if (!USERNAME_REGEX.test(username)) {
    return {
      error: "Username must be 3–20 chars, letters/numbers/underscore only",
    };
  }
  if (!avatarUrl || !isValidAvatarForUser(avatarUrl, me.id)) {
    return { error: "Pick or upload an avatar" };
  }

  // Pre-flight uniqueness checks. The DB unique indices remain authoritative
  // (the catch below handles race losses); these run first for nicer errors.
  if (await isUsernameTaken(username)) {
    return { error: "Username is taken" };
  }
  if ((await findUserIdByEmail(email)) !== null) {
    return { error: "Email is already in use" };
  }

  try {
    // Stage email in pending_email until Supabase confirms; promoted to
    // users.email by /auth/confirm-email.
    await applyOnboarding(me.id, {
      firstName,
      lastName,
      pendingEmail: email,
      username,
      avatarUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("users_username_lower_unique")) {
      return { error: "Username is taken" };
    }
    if (message.includes("users_email_lower_unique")) {
      return { error: "Email is already in use" };
    }
    return { error: "Could not save — try again" };
  }

  // Set user_metadata.onboarded = true so the proxy's onboarded gate can
  // read it without a DB query. Also kick off email confirmation. Both
  // wrapped — neither is essential to onboarding-completion.
  try {
    const supabase = await createClient();
    const emailRedirectTo = siteUrlFor("/auth/confirm-email");
    const { error } = await supabase.auth.updateUser(
      { email, data: { onboarded: true } },
      { emailRedirectTo },
    );
    if (error) {
      console.error("[completeOnboarding] auth.updateUser failed");
    }
  } catch {
    console.error("[completeOnboarding] auth.updateUser threw");
  }

  redirect("/contest");
}
