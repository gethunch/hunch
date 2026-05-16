import { cache } from "react";
import { desc, eq, gt, inArray, sql } from "drizzle-orm";
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

  // First-time sign-in — stub row; the user completes their profile at
  // /onboarding. Two parallel page renders both reach this point with no
  // existing row; onConflictDoNothing makes the INSERT idempotent at the PK
  // level. If we got nothing back (the other request inserted first), we
  // re-SELECT to read whatever they wrote.
  const inserted = await db
    .insert(users)
    .values({
      id: authUser.id,
      phone: authUser.phone ?? "",
    })
    .onConflictDoNothing({ target: users.id })
    .returning();

  if (inserted[0]) return inserted[0];

  const reread = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);
  return reread[0] ?? null;
});

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByUsername(
  username: string,
): Promise<AppUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
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

export interface LeaderboardPage {
  rows: AppUser[];
  total: number;
}

export async function getLeaderboardPage({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
} = {}): Promise<LeaderboardPage> {
  const where = gt(users.contestsPlayed, 0);
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.rating), users.id)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(where),
  ]);
  return { rows, total: totalRows[0]?.count ?? 0 };
}

export async function searchUsers(
  q: string,
  limit = 25,
): Promise<AppUser[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const pattern = `%${trimmed.toLowerCase()}%`;
  return await db
    .select()
    .from(users)
    .where(
      sql`(
        lower(${users.username}) like ${pattern}
        or lower(coalesce(${users.firstName}, '')) like ${pattern}
        or lower(coalesce(${users.lastName}, '')) like ${pattern}
        or lower(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')) like ${pattern}
      )`,
    )
    .orderBy(desc(users.rating), users.id)
    .limit(limit);
}

export interface UserRatingAggregates {
  peak: number;
  lastDelta: number;
}

export async function getUserRatingAggregates(
  userIds: string[],
): Promise<Map<string, UserRatingAggregates>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: ratingHistory.userId,
      ratingAfter: ratingHistory.ratingAfter,
      delta: ratingHistory.delta,
      createdAt: ratingHistory.createdAt,
    })
    .from(ratingHistory)
    .where(inArray(ratingHistory.userId, userIds))
    .orderBy(ratingHistory.createdAt);

  const peakByUser = new Map<string, number>();
  const lastDeltaByUser = new Map<string, number>();
  for (const r of rows) {
    const currentPeak = peakByUser.get(r.userId);
    if (currentPeak === undefined || r.ratingAfter > currentPeak) {
      peakByUser.set(r.userId, r.ratingAfter);
    }
    // ASC order, so last write wins for lastDelta
    lastDeltaByUser.set(r.userId, r.delta);
  }
  const result = new Map<string, UserRatingAggregates>();
  for (const id of userIds) {
    const peak = peakByUser.get(id);
    const lastDelta = lastDeltaByUser.get(id);
    if (peak !== undefined && lastDelta !== undefined) {
      result.set(id, { peak, lastDelta });
    }
  }
  return result;
}

// --- Mutations ---
// Centralized here per CLAUDE.md: "All DB access goes through /lib/repository.
// Routes and server actions never call Drizzle directly."

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  return rows.length > 0;
}

export async function findUserIdByEmail(
  email: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return rows[0]?.id ?? null;
}

export interface OnboardingPayload {
  firstName: string;
  lastName: string;
  pendingEmail: string;
  username: string;
  avatarUrl: string;
}

export async function applyOnboarding(
  userId: string,
  payload: OnboardingPayload,
): Promise<void> {
  await db
    .update(users)
    .set({
      firstName: payload.firstName,
      lastName: payload.lastName,
      pendingEmail: payload.pendingEmail,
      username: payload.username,
      avatarUrl: payload.avatarUrl,
      onboarded: true,
    })
    .where(eq(users.id, userId));
}

export async function updateUserName(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  await db
    .update(users)
    .set({ firstName, lastName })
    .where(eq(users.id, userId));
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string,
): Promise<void> {
  await db
    .update(users)
    .set({ avatarUrl })
    .where(eq(users.id, userId));
}

export async function updateUserPendingEmail(
  userId: string,
  pendingEmail: string,
): Promise<void> {
  await db
    .update(users)
    .set({ pendingEmail })
    .where(eq(users.id, userId));
}

export async function clearUserPendingEmail(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ pendingEmail: null })
    .where(eq(users.id, userId));
}

export async function markUserEmailVerified(
  userId: string,
  email: string,
  verifiedAt: Date,
): Promise<void> {
  await db
    .update(users)
    .set({
      email,
      pendingEmail: null,
      emailVerifiedAt: verifiedAt,
    })
    .where(eq(users.id, userId));
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
  contestSlug: string;
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
      contestSlug: contests.slug,
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
    contestSlug: e.contestSlug,
    finalReturn: e.finalReturn,
    finalRank: e.finalRank,
    ratingDelta: e.ratingDelta,
    picks: picksByEntry.get(e.entryId) ?? [],
  }));
}
