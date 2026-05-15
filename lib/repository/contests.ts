import { and, asc, eq } from "drizzle-orm";
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
