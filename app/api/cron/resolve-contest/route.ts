// Vercel Cron: Fridays at 15:35 IST (= 10:05 UTC).
// Schedules will be wired in vercel.json in Phase 6. For now this endpoint
// is invoked manually via curl with the Bearer secret.

import { NextResponse } from "next/server";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contests,
  entries,
  entryPicks,
  ratingHistory,
  users,
} from "@/lib/db/schema";
import {
  CONTEST_FORMAT_WEEKLY_PICK_5,
  NIFTY_50,
  contestSlug,
  contestTimestampsForMonday,
  istDateString,
  nextContestMondayIST,
} from "@/lib/constants";
import { fetchDailyPrices } from "@/lib/market";
import { computeRatingDelta } from "@/lib/rating";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Pick = typeof entryPicks.$inferSelect;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const candidate = await db
    .select()
    .from(contests)
    .where(
      and(
        eq(contests.format, CONTEST_FORMAT_WEEKLY_PICK_5),
        eq(contests.status, "live"),
        lte(contests.resolvesAt, now),
      ),
    )
    .orderBy(asc(contests.resolvesAt))
    .limit(1);

  const contest = candidate[0];
  if (!contest) {
    return NextResponse.json({ ok: true, reason: "no contest to resolve" });
  }

  // Friday in IST. resolvesAt is a Date; istDateString formats it to YYYY-MM-DD IST.
  const fridayDate = istDateString(contest.resolvesAt);

  const symbols = NIFTY_50.map((s) => s.symbol);
  const prices = await fetchDailyPrices(fridayDate, symbols);
  const closeBySymbol = new Map(prices.map((p) => [p.symbol, p.close]));

  const contestEntries = await db
    .select()
    .from(entries)
    .where(eq(entries.contestId, contest.id))
    .orderBy(asc(entries.submittedAt));

  const allPicks = await db
    .select()
    .from(entryPicks)
    .innerJoin(entries, eq(entryPicks.entryId, entries.id))
    .where(eq(entries.contestId, contest.id));

  const picksByEntry = new Map<string, Pick[]>();
  for (const row of allPicks) {
    const list = picksByEntry.get(row.entries.id) ?? [];
    list.push(row.entry_picks);
    picksByEntry.set(row.entries.id, list);
  }

  // Compute final_return per entry (equal-weight mean of pick returns).
  type Computed = {
    entryId: string;
    userId: string;
    submittedAt: Date;
    finalReturn: number;
    picks: Pick[];
  };
  const computed: Computed[] = contestEntries.map((entry) => {
    const picks = picksByEntry.get(entry.id) ?? [];
    let sumReturn = 0;
    let counted = 0;
    for (const p of picks) {
      const close = closeBySymbol.get(p.symbol);
      const entryPrice = p.entryPrice;
      if (close == null || entryPrice == null || entryPrice <= 0) continue;
      sumReturn += (close - entryPrice) / entryPrice;
      counted++;
    }
    const finalReturn = counted > 0 ? sumReturn / counted : 0;
    return {
      entryId: entry.id,
      userId: entry.userId,
      submittedAt: entry.submittedAt,
      finalReturn,
      picks,
    };
  });

  // Rank: desc by finalReturn, tie-break by earlier submittedAt.
  computed.sort((a, b) => {
    if (b.finalReturn !== a.finalReturn) return b.finalReturn - a.finalReturn;
    return a.submittedAt.getTime() - b.submittedAt.getTime();
  });

  const total = computed.length;

  const skipped = await db.transaction(async (tx) => {
    // Re-select the contest with a row lock. Two cron invocations racing on
    // the same contest both reach this point; the first acquires the lock,
    // the second blocks until the first commits, then re-reads status as
    // 'resolved' and bails — preventing double-credited ratings.
    const locked = await tx
      .select({ status: contests.status })
      .from(contests)
      .where(eq(contests.id, contest.id))
      .limit(1)
      .for("update");
    if (!locked[0] || locked[0].status !== "live") {
      return "already-resolved" as const;
    }

    // Stamp exit_price on every pick.
    for (const c of computed) {
      for (const p of c.picks) {
        const close = closeBySymbol.get(p.symbol);
        if (close == null) continue;
        await tx
          .update(entryPicks)
          .set({ exitPrice: close })
          .where(eq(entryPicks.id, p.id));
      }
    }

    // Per-entry: apply rating delta, write entry rank/return/delta, update user.
    for (let i = 0; i < computed.length; i++) {
      const c = computed[i];
      const rank = i + 1;
      const rankFraction = rank / total;

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, c.userId))
        .limit(1);
      if (!user) continue;

      const before = user.rating;
      const delta = computeRatingDelta(before, rankFraction, total);
      const after = before + delta;

      await tx
        .update(entries)
        .set({
          finalReturn: c.finalReturn,
          finalRank: rank,
          ratingDelta: delta,
        })
        .where(eq(entries.id, c.entryId));

      await tx
        .update(users)
        .set({
          rating: after,
          contestsPlayed: sql`${users.contestsPlayed} + 1`,
        })
        .where(eq(users.id, c.userId));

      await tx.insert(ratingHistory).values({
        userId: c.userId,
        contestId: contest.id,
        ratingBefore: before,
        ratingAfter: after,
        delta,
      });
    }

    // Mark contest resolved.
    await tx
      .update(contests)
      .set({ status: "resolved" })
      .where(eq(contests.id, contest.id));

    // Seed next week's contest if not already present.
    const nextMonday = nextContestMondayIST();
    const { opensAt, locksAt, resolvesAt } =
      contestTimestampsForMonday(nextMonday);

    const existingNext = await tx
      .select({ id: contests.id })
      .from(contests)
      .where(
        and(
          eq(contests.format, CONTEST_FORMAT_WEEKLY_PICK_5),
          eq(contests.periodStart, nextMonday),
        ),
      )
      .limit(1);

    if (!existingNext[0]) {
      await tx.insert(contests).values({
        format: CONTEST_FORMAT_WEEKLY_PICK_5,
        periodStart: nextMonday,
        slug: contestSlug({
          format: CONTEST_FORMAT_WEEKLY_PICK_5,
          periodStart: nextMonday,
        }),
        opensAt,
        locksAt,
        resolvesAt,
        status: "open",
      });
    }
    return "resolved" as const;
  });

  if (skipped === "already-resolved") {
    return NextResponse.json({
      ok: true,
      contest_id: contest.id,
      reason: "already resolved by concurrent worker",
    });
  }

  return NextResponse.json({
    ok: true,
    contest_id: contest.id,
    entries_resolved: total,
  });
}
