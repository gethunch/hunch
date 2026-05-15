import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type AppUser = typeof users.$inferSelect;

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);
  if (existing[0]) return existing[0];

  // First-time sign-in — create the row.
  // display_name is unique; uuid-prefix derivation collides at ~1 in 4 billion.
  // Profile page (Phase 4) will let users pick a real one.
  const displayName = `player-${authUser.id.slice(0, 8)}`;
  const [created] = await db
    .insert(users)
    .values({
      id: authUser.id,
      phone: authUser.phone ?? "",
      displayName,
    })
    .returning();

  return created;
});
