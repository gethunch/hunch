// Insert a backdated contest with synthetic users + entries for testing the
// cron endpoints end-to-end. The contest's opens_at/resolves_at are set so
// that both open-contest and resolve-contest crons will pick it up on their
// next invocation.
//
// Cleanup is manual via Supabase SQL editor:
//   delete from rating_history where contest_id = '<id>';
//   delete from entry_picks where entry_id in (select id from entries where contest_id = '<id>');
//   delete from entries where contest_id = '<id>';
//   delete from contests where id = '<id>';
//   delete from users where phone like '+91999990%';  -- test users
//
// Run: npm run seed:test-contest

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, entries, entryPicks, users } from "@/lib/db/schema";
import { CONTEST_FORMAT_WEEKLY_PICK_5 } from "@/lib/constants";
import { randomUUID } from "node:crypto";

const TEST_PERIOD_START = "2026-05-11"; // last Monday before today (2026-05-15)
const TEST_OPENS_AT = new Date("2026-05-11T09:15:00+05:30");
const TEST_RESOLVES_AT = new Date("2026-05-15T15:30:00+05:30");

const TEST_USERS = [
  { phone: "+919999900010", username: "test_balanced", rating: 1500 },
  { phone: "+919999900011", username: "test_strong", rating: 1700 },
  { phone: "+919999900012", username: "test_weak", rating: 1300 },
  { phone: "+919999900013", username: "test_elite", rating: 2200 },
  { phone: "+919999900014", username: "test_rookie", rating: 900 },
];

const PICKS_PER_USER: string[][] = [
  ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"],
  ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
  ["HDFCBANK", "ICICIBANK", "AXISBANK", "KOTAKBANK", "SBIN"],
  ["SUNPHARMA", "CIPLA", "DRREDDY", "HINDUNILVR", "ITC"],
  ["NTPC", "POWERGRID", "ONGC", "BPCL", "COALINDIA"],
];

async function main() {
  // Idempotency: if the test contest already exists, bail early.
  const existing = await db
    .select()
    .from(contests)
    .where(
      and(
        eq(contests.format, CONTEST_FORMAT_WEEKLY_PICK_5),
        eq(contests.periodStart, TEST_PERIOD_START),
      ),
    )
    .limit(1);

  if (existing[0]) {
    console.log(
      `Test contest already exists (id=${existing[0].id}, status=${existing[0].status}). ` +
        `Clean up manually if you want a fresh test.`,
    );
    process.exit(0);
  }

  // Insert test users (or fetch existing by phone).
  const userIds: string[] = [];
  for (const u of TEST_USERS) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.phone, u.phone))
      .limit(1);
    if (existingUser[0]) {
      userIds.push(existingUser[0].id);
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        phone: u.phone,
        username: u.username,
        firstName: "Test",
        lastName: u.username.replace(/^test_/, ""),
        rating: u.rating,
        onboarded: true,
      })
      .returning();
    userIds.push(created.id);
  }

  // Insert the backdated contest.
  const [contest] = await db
    .insert(contests)
    .values({
      format: CONTEST_FORMAT_WEEKLY_PICK_5,
      periodStart: TEST_PERIOD_START,
      opensAt: TEST_OPENS_AT,
      locksAt: TEST_OPENS_AT,
      resolvesAt: TEST_RESOLVES_AT,
      status: "open",
    })
    .returning();

  // Insert entries with picks.
  for (let i = 0; i < userIds.length; i++) {
    const [entry] = await db
      .insert(entries)
      .values({
        contestId: contest.id,
        userId: userIds[i],
      })
      .returning();
    await db
      .insert(entryPicks)
      .values(
        PICKS_PER_USER[i].map((symbol) => ({
          entryId: entry.id,
          symbol,
        })),
      );
  }

  await db
    .update(contests)
    .set({ entryCount: TEST_USERS.length })
    .where(eq(contests.id, contest.id));

  console.log("Test contest seeded:");
  console.log(`  contest_id   = ${contest.id}`);
  console.log(`  period_start = ${TEST_PERIOD_START}`);
  console.log(`  entries      = ${TEST_USERS.length}`);
  console.log("");
  console.log("Now run the open-contest cron, then resolve-contest:");
  console.log(
    `  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/open-contest`,
  );
  console.log(
    `  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/resolve-contest`,
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
