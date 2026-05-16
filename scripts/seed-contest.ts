// One-off script: seed the next `weekly_pick_5` contest.
// Idempotent — re-running on the same day inserts nothing thanks to
// the unique(format, period_start) constraint, but we check first so
// re-runs print a friendly message instead of throwing.
//
// Run with: npm run seed:contest
//
// Will be replaced by /api/cron/resolve-contest seeding the next week
// automatically in Phase 6. Until then, run this manually before each
// contest week.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests } from "@/lib/db/schema";
import {
  CONTEST_FORMAT_WEEKLY_PICK_5,
  contestSlug,
  contestTimestampsForMonday,
  nextContestMondayIST,
} from "@/lib/constants";

async function main() {
  const periodStart = nextContestMondayIST();
  const { opensAt, locksAt, resolvesAt } =
    contestTimestampsForMonday(periodStart);

  const existing = await db
    .select()
    .from(contests)
    .where(
      and(
        eq(contests.format, CONTEST_FORMAT_WEEKLY_PICK_5),
        eq(contests.periodStart, periodStart),
      ),
    )
    .limit(1);

  if (existing[0]) {
    console.log(
      `Contest for ${CONTEST_FORMAT_WEEKLY_PICK_5} / ${periodStart} already exists ` +
        `(id=${existing[0].id}, status=${existing[0].status}). Nothing to do.`,
    );
    process.exit(0);
  }

  const [row] = await db
    .insert(contests)
    .values({
      format: CONTEST_FORMAT_WEEKLY_PICK_5,
      periodStart,
      slug: contestSlug({ format: CONTEST_FORMAT_WEEKLY_PICK_5, periodStart }),
      opensAt,
      locksAt,
      resolvesAt,
      status: "open",
    })
    .returning();

  console.log("Seeded contest:");
  console.log(`  id           = ${row.id}`);
  console.log(`  format       = ${row.format}`);
  console.log(`  period_start = ${row.periodStart}`);
  console.log(`  opens_at     = ${row.opensAt.toISOString()}`);
  console.log(`  resolves_at  = ${row.resolvesAt.toISOString()}`);
  console.log(`  status       = ${row.status}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
