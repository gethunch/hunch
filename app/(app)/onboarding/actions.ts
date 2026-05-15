"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/repository/users";
import { createClient } from "@/lib/supabase/server";
import { isValidAvatarForUser } from "@/lib/avatars";
import { EMAIL_REGEX, USERNAME_REGEX } from "@/lib/identity";

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

  // Pre-flight uniqueness checks. Race-safe versions live in the catch below.
  const usernameClash = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  if (usernameClash[0]) return { error: "Username is taken" };

  const emailClash = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  if (emailClash[0]) return { error: "Email is already in use" };

  try {
    await db
      .update(users)
      .set({
        firstName,
        lastName,
        email,
        username,
        avatarUrl,
        onboarded: true,
      })
      .where(eq(users.id, me.id));
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

  // Fire the email-confirmation flow. Supabase will email a verification link
  // that lands at /auth/confirm-email. We don't block onboarding on this —
  // emailVerifiedAt stays null until the link is clicked.
  // Wrapped in try/catch so a Supabase config issue (e.g. unallowlisted
  // redirect URL) doesn't crash the action after the DB write succeeded.
  try {
    const supabase = await createClient();
    const hdrs = await headers();
    const host = hdrs.get("host") ?? "localhost:3000";
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    const emailRedirectTo = `${proto}://${host}/auth/confirm-email`;
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo },
    );
    if (error) {
      console.error("[completeOnboarding] email verification kickoff:", error);
    }
  } catch (err) {
    console.error("[completeOnboarding] email verification threw:", err);
  }

  redirect("/contest");
}
