"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/repository/users";
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
        // Stage in pending_email until Supabase confirms the address.
        // Promoting to users.email happens in /auth/confirm-email.
        pendingEmail: email,
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
      console.error("[completeOnboarding] auth.updateUser:", error);
    }
  } catch (err) {
    console.error("[completeOnboarding] auth.updateUser threw:", err);
  }

  redirect("/contest");
}
