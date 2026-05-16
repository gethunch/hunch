"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/repository/users";
import { createClient } from "@/lib/supabase/server";
import { isValidAvatarForUser } from "@/lib/avatars";
import { EMAIL_REGEX, NAME_MAX_LEN } from "@/lib/identity";
import { siteUrlFor } from "@/lib/site-url";

export type ActionResult = { ok: true } | { error: string };

function trim(v: string, max: number): string {
  return v.trim().slice(0, max);
}

function pathsToRevalidate(username: string | null): string[] {
  const paths = ["/leaderboard"];
  if (username) paths.push(`/profile/${username}`);
  return paths;
}

export async function updateName(
  firstNameIn: string,
  lastNameIn: string,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  const firstName = trim(firstNameIn, NAME_MAX_LEN);
  const lastName = trim(lastNameIn, NAME_MAX_LEN);
  if (firstName.length < 1) return { error: "First name is required" };
  if (lastName.length < 1) return { error: "Last name is required" };

  await db
    .update(users)
    .set({ firstName, lastName })
    .where(eq(users.id, me.id));

  for (const p of pathsToRevalidate(me.username)) revalidatePath(p);
  return { ok: true };
}

export async function updateEmail(emailIn: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  const email = trim(emailIn, 254);
  if (!EMAIL_REGEX.test(email)) return { error: "Email looks invalid" };

  // If the user re-submits their already-verified address, clear any stale
  // pending value and return early.
  if (email.toLowerCase() === (me.email ?? "").toLowerCase()) {
    if (me.pendingEmail) {
      await db
        .update(users)
        .set({ pendingEmail: null })
        .where(eq(users.id, me.id));
      for (const p of pathsToRevalidate(me.username)) revalidatePath(p);
    }
    return { ok: true };
  }

  // Block only against verified claims (users.email). Two users staging the
  // same pending_email is allowed — Supabase Auth enforces "first to verify
  // wins" via its own unique-email constraint.
  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  if (clash[0] && clash[0].id !== me.id) {
    return { error: "Email is already in use" };
  }

  // Stage in pending_email. users.email + emailVerifiedAt stay untouched,
  // so the existing verified address remains the claim until confirm-email
  // promotes the new one.
  try {
    await db
      .update(users)
      .set({ pendingEmail: email })
      .where(eq(users.id, me.id));
  } catch {
    return { error: "Could not save — try again" };
  }

  // Email update kickoff — wrapped so a Supabase failure (e.g. unallowlisted
  // redirect URL) doesn't crash the action after the DB write succeeded.
  try {
    const supabase = await createClient();
    const emailRedirectTo = siteUrlFor("/auth/confirm-email");
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo },
    );
    if (error) console.error("[updateEmail] kickoff");
  } catch {
    console.error("[updateEmail] threw");
  }

  for (const p of pathsToRevalidate(me.username)) revalidatePath(p);
  return { ok: true };
}

export async function resendEmailVerification(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  // Resend for the pending value if there is one; otherwise the legacy
  // "verified email exists but emailVerifiedAt unset" case.
  const target = me.pendingEmail ?? me.email;
  if (!target) return { error: "No email on file" };
  if (!me.pendingEmail && me.emailVerifiedAt) {
    return { error: "Already verified" };
  }

  try {
    const supabase = await createClient();
    const emailRedirectTo = siteUrlFor("/auth/confirm-email");
    const { error } = await supabase.auth.updateUser(
      { email: target },
      { emailRedirectTo },
    );
    if (error) {
      console.error("[resendEmailVerification] kickoff");
      return { error: error.message };
    }
  } catch {
    console.error("[resendEmailVerification] threw");
    return { error: "Could not send right now — try again" };
  }
  return { ok: true };
}

export async function updateAvatar(
  avatarUrlIn: string,
): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  const avatarUrl = avatarUrlIn.trim();
  if (!isValidAvatarForUser(avatarUrl, me.id)) {
    return { error: "Invalid avatar selection" };
  }

  await db
    .update(users)
    .set({ avatarUrl })
    .where(eq(users.id, me.id));

  for (const p of pathsToRevalidate(me.username)) revalidatePath(p);
  return { ok: true };
}
