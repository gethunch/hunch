// Vercel Cron: Mondays at 09:15 IST (= 03:45 UTC).
// Schedules will be wired in vercel.json in Phase 6. For now this endpoint
// is invoked manually via curl with the Bearer secret.

import { NextResponse } from "next/server";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries, entryPicks } from "@/lib/db/schema";
import { CONTEST_FORMAT_WEEKLY_PICK_5, NIFTY_50 } from "@/lib/constants";
import { fetchDailyPrices } from "@/lib/market";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
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

  // Entry ids + the distinct symbols those entries picked. We only need to
  // batch-update entry_picks by symbol scoped to this contest's entries.
  const entryRows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.contestId, contest.id));
  const entryIdsInContest = entryRows.map((e) => e.id);

  const symbolRows =
    entryIdsInContest.length === 0
      ? []
      : await db
          .selectDistinct({ symbol: entryPicks.symbol })
          .from(entryPicks)
          .where(inArray(entryPicks.entryId, entryIdsInContest));
  const symbolsInContest = symbolRows.map((s) => s.symbol);

  let updated = 0;
  await db.transaction(async (tx) => {
    // One UPDATE per distinct symbol, scoped to this contest's entries.
    // Avoids issuing N×5 statements for an N-entry contest.
    for (const symbol of symbolsInContest) {
      const open = priceBySymbol.get(symbol);
      if (open == null) continue;
      const rows = await tx
        .update(entryPicks)
        .set({ entryPrice: open })
        .where(
          and(
            eq(entryPicks.symbol, symbol),
            inArray(entryPicks.entryId, entryIdsInContest),
          ),
        )
        .returning({ id: entryPicks.id });
      updated += rows.length;
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
