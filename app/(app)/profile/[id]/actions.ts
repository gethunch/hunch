"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/repository/users";

export type UpdateNameResult =
  | { ok: true; displayName: string }
  | { error: string };

// First char must be a unicode letter or digit (no leading punctuation/space).
// Allowed throughout: letters, digits, spaces, dots, underscores, hyphens.
// Length 2..32.
const NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,31}$/u;

export async function updateDisplayName(
  rawName: string,
): Promise<UpdateNameResult> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  const name = rawName.trim();
  if (name.length < 2) {
    return { error: "Name must be at least 2 characters" };
  }
  if (name.length > 32) {
    return { error: "Name must be 32 characters or fewer" };
  }
  if (!NAME_REGEX.test(name)) {
    return {
      error:
        "Use letters, numbers, spaces, dots, dashes, or underscores. Must start with a letter or number.",
    };
  }
  if (name === me.displayName) {
    return { ok: true, displayName: name };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.displayName, name), ne(users.id, me.id)))
    .limit(1);
  if (existing[0]) {
    return { error: "That name is taken" };
  }

  try {
    await db
      .update(users)
      .set({ displayName: name })
      .where(eq(users.id, me.id));
  } catch {
    // Race against the unique index.
    return { error: "That name is taken" };
  }

  revalidatePath(`/profile/${me.id}`);
  revalidatePath("/leaderboard");
  return { ok: true, displayName: name };
}
