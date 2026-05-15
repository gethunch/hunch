"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/repository/users";
import { createClient } from "@/lib/supabase/server";
import { isValidAvatarForUser } from "@/lib/avatars";
import { EMAIL_REGEX, NAME_MAX_LEN } from "@/lib/identity";

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
  if (email.toLowerCase() === (me.email ?? "").toLowerCase()) {
    return { ok: true }; // no-op
  }

  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  if (clash[0] && clash[0].id !== me.id) {
    return { error: "Email is already in use" };
  }

  try {
    await db
      .update(users)
      .set({ email, emailVerifiedAt: null })
      .where(eq(users.id, me.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("users_email_lower_unique")) {
      return { error: "Email is already in use" };
    }
    return { error: "Could not save — try again" };
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const emailRedirectTo = `${proto}://${host}/auth/confirm-email`;
  await supabase.auth.updateUser({ email }, { emailRedirectTo });

  for (const p of pathsToRevalidate(me.username)) revalidatePath(p);
  return { ok: true };
}

export async function resendEmailVerification(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  if (!me.email) return { error: "No email on file" };
  if (me.emailVerifiedAt) return { error: "Already verified" };

  const supabase = await createClient();
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const emailRedirectTo = `${proto}://${host}/auth/confirm-email`;
  const { error } = await supabase.auth.updateUser(
    { email: me.email },
    { emailRedirectTo },
  );
  if (error) return { error: error.message };
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
