// Vercel Cron: Mondays at 09:15 IST (= 03:45 UTC).
// Schedules will be wired in vercel.json in Phase 6. For now this endpoint
// is invoked manually via curl with the Bearer secret.

import { NextResponse } from "next/server";
import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries, entryPicks } from "@/lib/db/schema";
import { CONTEST_FORMAT_WEEKLY_PICK_5, NIFTY_50 } from "@/lib/constants";
import { fetchDailyPrices } from "@/lib/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // Find an open contest whose opens_at has passed.
  const candidate = await db
    .select()
    .from(contests)
    .where(
      and(
        eq(contests.format, CONTEST_FORMAT_WEEKLY_PICK_5),
        eq(contests.status, "open"),
        lte(contests.opensAt, now),
      ),
    )
    .orderBy(asc(contests.opensAt))
    .limit(1);

  const contest = candidate[0];
  if (!contest) {
    return NextResponse.json({ ok: true, reason: "no contest to open" });
  }

  // Fetch open prices for the contest's Monday.
  const symbols = NIFTY_50.map((s) => s.symbol);
  const prices = await fetchDailyPrices(contest.periodStart, symbols);
  const priceBySymbol = new Map(prices.map((p) => [p.symbol, p.open]));

  // All picks across all entries for this contest.
  const allPicks = await db
    .select({
      pickId: entryPicks.id,
      symbol: entryPicks.symbol,
    })
    .from(entryPicks)
    .innerJoin(entries, eq(entryPicks.entryId, entries.id))
    .where(eq(entries.contestId, contest.id));

  let updated = 0;
  await db.transaction(async (tx) => {
    for (const row of allPicks) {
      const open = priceBySymbol.get(row.symbol);
      if (open == null) continue;
      await tx
        .update(entryPicks)
        .set({ entryPrice: open })
        .where(eq(entryPicks.id, row.pickId));
      updated++;
    }
    await tx
      .update(contests)
      .set({ status: "live" })
      .where(eq(contests.id, contest.id));
  });

  return NextResponse.json({
    ok: true,
    contest_id: contest.id,
    period_start: contest.periodStart,
    picks_updated: updated,
  });
}
