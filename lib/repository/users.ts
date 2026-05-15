import { cache } from "react";
import { desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contests,
  entries,
  entryPicks,
  ratingHistory,
  users,
} from "@/lib/db/schema";
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

  // First-time sign-in — stub row; the user completes their profile at /onboarding.
  const [created] = await db
    .insert(users)
    .values({
      id: authUser.id,
      phone: authUser.phone ?? "",
    })
    .returning();

  return created;
});

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getTopUsers(limit = 50): Promise<AppUser[]> {
  return await db
    .select()
    .from(users)
    .where(gt(users.contestsPlayed, 0))
    .orderBy(desc(users.rating))
    .limit(limit);
}

export interface RatingHistoryPoint {
  date: Date;
  ratingAfter: number;
  delta: number;
}

export async function getRatingHistory(
  userId: string,
): Promise<RatingHistoryPoint[]> {
  return await db
    .select({
      date: ratingHistory.createdAt,
      ratingAfter: ratingHistory.ratingAfter,
      delta: ratingHistory.delta,
    })
    .from(ratingHistory)
    .where(eq(ratingHistory.userId, userId))
    .orderBy(ratingHistory.createdAt);
}

export interface ProfileEntry {
  entryId: string;
  contestPeriodStart: string;
  finalReturn: number | null;
  finalRank: number | null;
  ratingDelta: number | null;
  picks: string[];
}

export async function getRecentEntries(
  userId: string,
  limit = 10,
): Promise<ProfileEntry[]> {
  const entryRows = await db
    .select({
      entryId: entries.id,
      finalReturn: entries.finalReturn,
      finalRank: entries.finalRank,
      ratingDelta: entries.ratingDelta,
      contestPeriodStart: contests.periodStart,
      submittedAt: entries.submittedAt,
    })
    .from(entries)
    .innerJoin(contests, eq(entries.contestId, contests.id))
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.submittedAt))
    .limit(limit);

  if (entryRows.length === 0) return [];

  const entryIds = entryRows.map((e) => e.entryId);
  const pickRows = await db
    .select({ entryId: entryPicks.entryId, symbol: entryPicks.symbol })
    .from(entryPicks)
    .where(inArray(entryPicks.entryId, entryIds));

  const picksByEntry = new Map<string, string[]>();
  for (const p of pickRows) {
    const list = picksByEntry.get(p.entryId) ?? [];
    list.push(p.symbol);
    picksByEntry.set(p.entryId, list);
  }

  return entryRows.map((e) => ({
    entryId: e.entryId,
    contestPeriodStart: e.contestPeriodStart,
    finalReturn: e.finalReturn,
    finalRank: e.finalRank,
    ratingDelta: e.ratingDelta,
    picks: picksByEntry.get(e.entryId) ?? [],
  }));
}
