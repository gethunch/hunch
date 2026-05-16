import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries } from "@/lib/db/schema";

export type Contest = typeof contests.$inferSelect;

export interface ContestResultForUser {
  rank: number;
  finalReturn: number;
  ratingDelta: number;
}

export async function getCurrentOpenContest(
  format: string,
): Promise<Contest | null> {
  const rows = await db
    .select()
    .from(contests)
    .where(and(eq(contests.format, format), eq(contests.status, "open")))
    .orderBy(asc(contests.periodStart))
    .limit(1);
  return rows[0] ?? null;
}

export async function getContestBySlug(slug: string): Promise<Contest | null> {
  const rows = await db
    .select()
    .from(contests)
    .where(eq(contests.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLiveContests(): Promise<Contest[]> {
  return await db
    .select()
    .from(contests)
    .where(eq(contests.status, "live"))
    .orderBy(asc(contests.resolvesAt));
}

export async function getUpcomingContests(): Promise<Contest[]> {
  return await db
    .select()
    .from(contests)
    .where(eq(contests.status, "open"))
    .orderBy(asc(contests.opensAt));
}

export async function getPastContests({
  limit = 10,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<Contest[]> {
  return await db
    .select()
    .from(contests)
    .where(eq(contests.status, "resolved"))
    .orderBy(desc(contests.periodStart))
    .limit(limit)
    .offset(offset);
}

// "Active" = whatever the user should land on from /contest. Prefer the live
// contest if there is one; else fall back to the next open contest.
export async function getCurrentActiveContest(): Promise<Contest | null> {
  const live = await getLiveContests();
  if (live[0]) return live[0];
  const upcoming = await getUpcomingContests();
  return upcoming[0] ?? null;
}

// Bulk-fetch one user's results across a set of contests. Used by the
// /contests index so each past row can show "you finished Xth · +Y" without
// firing one query per contest.
export async function getMyResultsForContests(
  userId: string,
  contestIds: string[],
): Promise<Map<string, ContestResultForUser>> {
  if (contestIds.length === 0) return new Map();
  const rows = await db
    .select({
      contestId: entries.contestId,
      finalRank: entries.finalRank,
      finalReturn: entries.finalReturn,
      ratingDelta: entries.ratingDelta,
    })
    .from(entries)
    .where(
      and(eq(entries.userId, userId), inArray(entries.contestId, contestIds)),
    );
  const map = new Map<string, ContestResultForUser>();
  for (const r of rows) {
    if (r.finalRank == null || r.finalReturn == null || r.ratingDelta == null) {
      continue;
    }
    map.set(r.contestId, {
      rank: r.finalRank,
      finalReturn: r.finalReturn,
      ratingDelta: r.ratingDelta,
    });
  }
  return map;
}
