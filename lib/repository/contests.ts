import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries, entryPicks, users } from "@/lib/db/schema";

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

export interface LeaderboardRow {
  entryId: string;
  rank: number;
  finalReturn: number;
  ratingDelta: number;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export async function getContestLeaderboard(
  contestId: string,
): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      entryId: entries.id,
      rank: entries.finalRank,
      finalReturn: entries.finalReturn,
      ratingDelta: entries.ratingDelta,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .where(eq(entries.contestId, contestId))
    .orderBy(asc(entries.finalRank));
  return rows
    .filter(
      (r): r is LeaderboardRow =>
        r.rank != null && r.finalReturn != null && r.ratingDelta != null,
    );
}

export interface PickWithReturn {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

export async function getContestPicks(
  contestId: string,
): Promise<Map<string, PickWithReturn[]>> {
  const rows = await db
    .select({
      entryId: entryPicks.entryId,
      symbol: entryPicks.symbol,
      entryPrice: entryPicks.entryPrice,
      exitPrice: entryPicks.exitPrice,
    })
    .from(entryPicks)
    .innerJoin(entries, eq(entryPicks.entryId, entries.id))
    .where(eq(entries.contestId, contestId));

  const map = new Map<string, PickWithReturn[]>();
  for (const r of rows) {
    if (r.entryPrice == null || r.exitPrice == null) continue;
    const returnPct = (r.exitPrice - r.entryPrice) / r.entryPrice;
    const list = map.get(r.entryId) ?? [];
    list.push({
      symbol: r.symbol,
      entryPrice: r.entryPrice,
      exitPrice: r.exitPrice,
      returnPct,
    });
    map.set(r.entryId, list);
  }
  return map;
}

export interface ContestStats {
  mostPicked: Array<{ symbol: string; count: number }>;
  bestStock: { symbol: string; returnPct: number } | null;
  worstStock: { symbol: string; returnPct: number } | null;
  medianReturn: number;
  topReturn: number;
  bottomReturn: number;
}

export async function getContestStats(
  contestId: string,
): Promise<ContestStats> {
  // Top-3 most-picked symbols
  const mostPickedRows = await db
    .select({
      symbol: entryPicks.symbol,
      count: sql<number>`count(*)::int`,
    })
    .from(entryPicks)
    .innerJoin(entries, eq(entryPicks.entryId, entries.id))
    .where(eq(entries.contestId, contestId))
    .groupBy(entryPicks.symbol)
    .orderBy(desc(sql`count(*)`))
    .limit(3);

  // Distinct (symbol, entry_price, exit_price). Within a single contest, all
  // picks for the same symbol share the same prices (the cron stamps them
  // once per symbol-per-date), so DISTINCT collapses to one row per symbol.
  const stockRows = await db
    .selectDistinct({
      symbol: entryPicks.symbol,
      entryPrice: entryPicks.entryPrice,
      exitPrice: entryPicks.exitPrice,
    })
    .from(entryPicks)
    .innerJoin(entries, eq(entryPicks.entryId, entries.id))
    .where(eq(entries.contestId, contestId));

  let bestStock: { symbol: string; returnPct: number } | null = null;
  let worstStock: { symbol: string; returnPct: number } | null = null;
  for (const row of stockRows) {
    if (row.entryPrice == null || row.exitPrice == null) continue;
    const r = (row.exitPrice - row.entryPrice) / row.entryPrice;
    if (!bestStock || r > bestStock.returnPct) {
      bestStock = { symbol: row.symbol, returnPct: r };
    }
    if (!worstStock || r < worstStock.returnPct) {
      worstStock = { symbol: row.symbol, returnPct: r };
    }
  }

  // Median + top from entries.final_return (sorted asc).
  const returnRows = await db
    .select({ finalReturn: entries.finalReturn })
    .from(entries)
    .where(eq(entries.contestId, contestId))
    .orderBy(asc(entries.finalReturn));
  const validReturns = returnRows
    .map((r) => r.finalReturn)
    .filter((r): r is number => r != null);

  const median =
    validReturns.length === 0
      ? 0
      : validReturns[Math.floor(validReturns.length / 2)];
  const top = validReturns[validReturns.length - 1] ?? 0;
  const bottom = validReturns[0] ?? 0;

  return {
    mostPicked: mostPickedRows,
    bestStock,
    worstStock,
    medianReturn: median,
    topReturn: top,
    bottomReturn: bottom,
  };
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
