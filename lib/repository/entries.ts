import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries, entryPicks } from "@/lib/db/schema";

export type Entry = typeof entries.$inferSelect;
export type EntryPick = typeof entryPicks.$inferSelect;

export async function getEntryForUser(
  contestId: string,
  userId: string,
): Promise<{ entry: Entry; picks: EntryPick[] } | null> {
  const entryRows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.contestId, contestId), eq(entries.userId, userId)))
    .limit(1);
  const entry = entryRows[0];
  if (!entry) return null;
  const picks = await db
    .select()
    .from(entryPicks)
    .where(eq(entryPicks.entryId, entry.id));
  return { entry, picks };
}

// Atomically insert an entry, its 5 picks, and bump contests.entry_count.
// Caller is responsible for validating the symbols/contest/user; the unique
// index on (contest_id, user_id) is the last-line defense against double-submit.
export async function submitEntry({
  contestId,
  userId,
  symbols,
}: {
  contestId: string;
  userId: string;
  symbols: string[];
}): Promise<{ entry: Entry; picks: EntryPick[] }> {
  return await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(entries)
      .values({ contestId, userId })
      .returning();
    const picks = await tx
      .insert(entryPicks)
      .values(symbols.map((symbol) => ({ entryId: entry.id, symbol })))
      .returning();
    await tx
      .update(contests)
      .set({ entryCount: sql`${contests.entryCount} + 1` })
      .where(eq(contests.id, contestId));
    return { entry, picks };
  });
}
