// Seed 6 weeks of past resolved contests with realistic Indian-named users
// and actual NIFTY 50 prices from Yahoo. Powers the /contests page and per-
// contest leaderboards in dev/staging.
//
// Phones live in the +91 70000000XXX range — these don't collide with real
// Indian mobile numbers, which never start with 7-0-0-0-0-0-0-0-0.
//
// Re-running is idempotent: any prior seed contests + seed users are deleted
// before fresh ones are written.
//
// Run: npm run seed:history
// Wall time: ~30–90s depending on Yahoo response times.

import { inArray, like } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
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
import { RATING_DEFAULT, computeRatingDelta } from "@/lib/rating";
import { FIRST_NAMES, SURNAMES } from "./_data/indian-names";

const PHONE_PREFIX = "+917000000"; // followed by 3-digit user index
const USER_POOL_SIZE = 120;
const ENTRIES_PER_CONTEST = 60;
const WEEKS_BACK = 6;
const PICKS = 5;

// TMPV (Tata Motors Passenger Vehicles) only began trading after the
// 2026-05-14 demerger. Skip it from seed picks so older contests don't
// crash fetchDailyPrices on missing data.
const TICKERS_AVAILABLE = NIFTY_50
  .map((s) => s.symbol)
  .filter((s) => s !== "TMPV");

// Crowd-favorite large caps. Picked ~60% of the time to imitate real retail
// behavior — RELIANCE/TCS/HDFCBANK over the small-cap names.
const POPULAR_TICKERS: readonly string[] = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "BHARTIARTL", "SBIN", "ITC", "LT", "HINDUNILVR",
  "AXISBANK", "KOTAKBANK", "MARUTI", "ASIANPAINT", "TITAN",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickFiveSymbols(): string[] {
  const set = new Set<string>();
  while (set.size < PICKS) {
    const pickPopular = Math.random() < 0.6;
    set.add(pickPopular ? rand(POPULAR_TICKERS) : rand(TICKERS_AVAILABLE));
  }
  return Array.from(set);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// Yahoo intermittently drops connections when we burst-fetch ~50 symbols.
// Retry the whole batch up to 3 times with exponential backoff.
async function fetchWithRetry(
  date: string,
  symbols: readonly string[],
  label: string,
): Promise<Awaited<ReturnType<typeof fetchDailyPrices>>> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fetchDailyPrices(date, symbols);
    } catch (err) {
      lastErr = err;
      if (attempt === 4) break;
      const wait = 1000 * 2 ** (attempt - 1);
      console.log(`    ${label} attempt ${attempt} failed — retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

interface SeedUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  username: string;
}

function buildUserPool(): SeedUser[] {
  const firstShuffled = shuffle(Array.from(new Set(FIRST_NAMES)));
  const lastShuffled = shuffle(Array.from(new Set(SURNAMES)));
  const pool: SeedUser[] = [];
  for (let i = 0; i < USER_POOL_SIZE; i++) {
    const firstName = firstShuffled[i % firstShuffled.length];
    const lastName = lastShuffled[i % lastShuffled.length];
    const idx = String(i + 1).padStart(3, "0");
    pool.push({
      id: randomUUID(),
      phone: `${PHONE_PREFIX}${idx}`,
      firstName,
      lastName,
      username: `${firstName.toLowerCase()}_${idx}`,
    });
  }
  return pool;
}

function pastContestPeriodStarts(): string[] {
  // The 6 most recent fully-resolved Mondays. Walk back from the upcoming
  // contest's Monday so this stays correct regardless of when you run it.
  const upcoming = nextContestMondayIST();
  const upcomingMs = new Date(`${upcoming}T12:00:00Z`).getTime();
  const out: string[] = [];
  for (let weeksAgo = 1; weeksAgo <= WEEKS_BACK; weeksAgo++) {
    const d = new Date(upcomingMs - weeksAgo * 7 * 24 * 3600 * 1000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out.sort(); // oldest first so rating evolves chronologically
}

async function clearPriorSeed(seedSlugs: string[]): Promise<void> {
  // Find any prior seed contests by slug, then cascade-clear their data.
  const priorContests = await db
    .select({ id: contests.id })
    .from(contests)
    .where(inArray(contests.slug, seedSlugs));

  if (priorContests.length > 0) {
    const ids = priorContests.map((c) => c.id);
    await db.delete(ratingHistory).where(inArray(ratingHistory.contestId, ids));
    const priorEntries = await db
      .select({ id: entries.id })
      .from(entries)
      .where(inArray(entries.contestId, ids));
    if (priorEntries.length > 0) {
      // entry_picks has ON DELETE CASCADE against entries.id, so deleting
      // entries cleans up picks automatically.
      await db
        .delete(entries)
        .where(inArray(entries.id, priorEntries.map((e) => e.id)));
    }
    await db.delete(contests).where(inArray(contests.id, ids));
  }

  // Also nuke any prior seed users so phones/usernames don't collide on rerun.
  const priorUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.phone, `${PHONE_PREFIX}%`));
  if (priorUsers.length > 0) {
    const userIds = priorUsers.map((u) => u.id);
    await db
      .delete(ratingHistory)
      .where(inArray(ratingHistory.userId, userIds));
    const orphanEntries = await db
      .select({ id: entries.id })
      .from(entries)
      .where(inArray(entries.userId, userIds));
    if (orphanEntries.length > 0) {
      await db
        .delete(entries)
        .where(inArray(entries.id, orphanEntries.map((e) => e.id)));
    }
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

async function main() {
  console.log("seed:history — start");
  const periodStarts = pastContestPeriodStarts();
  const seedSlugs = periodStarts.map((ps) =>
    contestSlug({ format: CONTEST_FORMAT_WEEKLY_PICK_5, periodStart: ps }),
  );
  console.log(`  contests:  ${seedSlugs.join(", ")}`);

  console.log("  clearing prior seed…");
  await clearPriorSeed(seedSlugs);

  console.log("  building user pool…");
  const pool = buildUserPool();
  await db.insert(users).values(
    pool.map((u) => ({
      id: u.id,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      onboarded: true,
    })),
  );
  console.log(`  inserted ${pool.length} fake users`);

  // Per-user running rating + appearance counters. Updated as we resolve
  // each contest in chronological order.
  const ratings = new Map(pool.map((u) => [u.id, RATING_DEFAULT]));
  const playedCount = new Map(pool.map((u) => [u.id, 0]));

  for (const periodStart of periodStarts) {
    const slug = contestSlug({
      format: CONTEST_FORMAT_WEEKLY_PICK_5,
      periodStart,
    });
    console.log(`  → ${slug}`);
    const { opensAt, locksAt, resolvesAt } =
      contestTimestampsForMonday(periodStart);
    const fridayDate = istDateString(resolvesAt);

    // 1. Insert contest in 'open' state initially (cron-equivalent flow).
    const [contest] = await db
      .insert(contests)
      .values({
        format: CONTEST_FORMAT_WEEKLY_PICK_5,
        periodStart,
        slug,
        opensAt,
        locksAt,
        resolvesAt,
        status: "open",
      })
      .returning();

    // 2. Pre-generate entrants + their picks so we know which symbols to fetch.
    const entrants = shuffle(pool).slice(0, ENTRIES_PER_CONTEST);
    const picksByUser = new Map<string, string[]>(
      entrants.map((u) => [u.id, pickFiveSymbols()]),
    );
    const uniqSymbols = Array.from(
      new Set(Array.from(picksByUser.values()).flat()),
    );

    // 3. Fetch open + close (sequential to be polite to Yahoo).
    const opens = await fetchWithRetry(periodStart, uniqSymbols, `open ${periodStart}`);
    await sleep(500);
    const closes = await fetchWithRetry(fridayDate, uniqSymbols, `close ${fridayDate}`);
    const openBySymbol = new Map(opens.map((p) => [p.symbol, p.open]));
    const closeBySymbol = new Map(closes.map((p) => [p.symbol, p.close]));

    // 4. Bulk insert entries.
    const insertedEntries = await db
      .insert(entries)
      .values(entrants.map((u) => ({ contestId: contest.id, userId: u.id })))
      .returning();
    const entryIdByUser = new Map(
      insertedEntries.map((e) => [e.userId, e.id]),
    );

    // 5. Bulk insert picks with both prices baked in.
    const pickValues = entrants.flatMap((u) => {
      const entryId = entryIdByUser.get(u.id)!;
      return picksByUser.get(u.id)!.map((symbol) => ({
        entryId,
        symbol,
        entryPrice: openBySymbol.get(symbol)!,
        exitPrice: closeBySymbol.get(symbol)!,
      }));
    });
    await db.insert(entryPicks).values(pickValues);

    // 6. Compute final returns, rank entries.
    type Computed = { userId: string; entryId: string; finalReturn: number };
    const computed: Computed[] = entrants.map((u) => {
      const symbols = picksByUser.get(u.id)!;
      const r =
        symbols.reduce((acc, sym) => {
          const o = openBySymbol.get(sym)!;
          const c = closeBySymbol.get(sym)!;
          return acc + (c - o) / o;
        }, 0) / symbols.length;
      return { userId: u.id, entryId: entryIdByUser.get(u.id)!, finalReturn: r };
    });
    computed.sort((a, b) => b.finalReturn - a.finalReturn);

    // 7. Apply rating deltas, stamp entry rank/return/delta, write rating history.
    const historyRows: typeof ratingHistory.$inferInsert[] = [];
    for (let i = 0; i < computed.length; i++) {
      const c = computed[i];
      const rank = i + 1;
      const before = ratings.get(c.userId)!;
      const delta = computeRatingDelta(before, rank / computed.length, computed.length);
      const after = before + delta;
      ratings.set(c.userId, after);
      playedCount.set(c.userId, (playedCount.get(c.userId) ?? 0) + 1);

      await db
        .update(entries)
        .set({
          finalReturn: c.finalReturn,
          finalRank: rank,
          ratingDelta: delta,
        })
        .where(eq(entries.id, c.entryId));

      historyRows.push({
        userId: c.userId,
        contestId: contest.id,
        ratingBefore: before,
        ratingAfter: after,
        delta,
      });
    }
    await db.insert(ratingHistory).values(historyRows);

    // 8. Mark contest resolved.
    await db
      .update(contests)
      .set({ status: "resolved", entryCount: entrants.length })
      .where(eq(contests.id, contest.id));

    // Breathing room for Yahoo before the next contest's two big batches.
    await sleep(1500);
  }

  // 9. Persist final ratings + contestsPlayed to user rows.
  console.log("  committing final ratings…");
  for (const u of pool) {
    const cp = playedCount.get(u.id) ?? 0;
    if (cp === 0) continue;
    await db
      .update(users)
      .set({ rating: ratings.get(u.id)!, contestsPlayed: cp })
      .where(eq(users.id, u.id));
  }

  console.log("seed:history — done");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed:history failed:", err);
  process.exit(1);
});
