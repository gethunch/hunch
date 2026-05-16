import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests } from "@/lib/db/schema";

export type Contest = typeof contests.$inferSelect;

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
