import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import {
  getContestBySlug,
  getContestEntriesWithUsers,
  getContestLeaderboard,
  getContestLivePicks,
  getContestPicks,
  getContestStats,
  type LeaderboardRow,
  type PickWithReturn,
} from "@/lib/repository/contests";
import { getEntryForUser } from "@/lib/repository/entries";
import {
  fetchIndexLastPrice,
  fetchLastPrices,
} from "@/lib/market/live";
import { fetchIndexWeeklyChange } from "@/lib/market";
import { NIFTY_50 } from "@/lib/constants";
import {
  ContestDetailHeader,
  type StatCell,
  returnTone,
} from "@/components/contest-detail-header";
import { ContestLeaderboardTable } from "@/components/contest-leaderboard-table";
import { ContestCountdown } from "@/components/contest-countdown";
import { EntryView } from "@/components/entry-view";
import {
  formatDayMonth,
  formatRatingDelta,
  formatReturnPct,
  formatTimeSince,
} from "@/lib/contest-display";

// Revalidate the live view every 60s in tandem with fetchLastPrices'
// unstable_cache window. Resolved + open views are static.
export const revalidate = 60;

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const me = await getCurrentUser();

  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) notFound();

  const meId = me?.id ?? null;
  const meOnboarded = !!me?.onboarded && !!me.username;

  if (contest.status === "resolved") {
    return <ResolvedView contest={contest} meId={meId} />;
  }
  if (contest.status === "live") {
    return <LiveView contest={contest} meId={meId} />;
  }
  return (
    <OpenView contest={contest} meId={meId} meOnboarded={meOnboarded} />
  );
}

async function OpenView({
  contest,
  meId,
  meOnboarded,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getContestBySlug>>>;
  meId: string | null;
  meOnboarded: boolean;
}) {
  const existing =
    meId && meOnboarded ? await getEntryForUser(contest.id, meId) : null;
  const existingPicks = existing ? existing.picks.map((p) => p.symbol) : null;
  // status === "open" implies we're before locks_at; the cron flips status to
  // "live" at lock time. The server action does its own Date.now() check at
  // submit-time as the source of truth.
  const canEdit = true;
  const fridayDate = istFridayFor(contest.periodStart);

  const statCells: StatCell[] = [
    { label: "Entries so far", value: contest.entryCount.toString() },
    { label: "Picks per entry", value: "5" },
    { label: "Period start", value: formatDayMonth(contest.periodStart) },
    { label: "Resolves", value: formatDayMonth(fridayDate) },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <Link
        href="/contests"
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All contests
      </Link>

      <ContestDetailHeader
        contest={contest}
        statusLabel="Open"
        statusTone="open"
        subtitle={
          <ContestCountdown locksAtISO={contest.locksAt.toISOString()} />
        }
        stats={statCells}
      />

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-1">
          {existingPicks ? "Your picks" : "Pick 5 stocks"}
        </h2>
        {!meId ? (
          <AuthPrompt
            title="Sign in to enter"
            description="You can browse contests without an account. To submit your 5 picks, sign in with your phone."
            ctaLabel="Sign in to enter →"
            href={`/login?next=/contests/${contest.slug}`}
          />
        ) : !meOnboarded ? (
          <AuthPrompt
            title="Finish setting up your profile"
            description="You're signed in but haven't picked a name, username, and avatar yet. Two minutes."
            ctaLabel="Complete profile →"
            href="/onboarding"
          />
        ) : (
          <EntryView
            slug={contest.slug}
            existingPicks={existingPicks}
            canEdit={canEdit}
          />
        )}
      </section>
    </main>
  );
}

function AuthPrompt({
  title,
  description,
  ctaLabel,
  href,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <div className="border border-zinc-900 rounded-lg p-6 space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-block text-sm bg-white text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 rounded-md px-4 py-2 font-medium"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

// "2026-05-18" → "2026-05-22" (Monday + 4 days).
function istFridayFor(periodStart: string): string {
  const d = new Date(`${periodStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4);
  return d.toISOString().slice(0, 10);
}

async function ResolvedView({
  contest,
  meId,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getContestBySlug>>>;
  meId: string | null;
}) {
  const [leaderboard, picksByEntry, stats, indexChange] = await Promise.all([
    getContestLeaderboard(contest.id),
    getContestPicks(contest.id),
    getContestStats(contest.id),
    fetchIndexWeeklyChange(contest.periodStart),
  ]);

  const myRow = leaderboard.find((r) => r.userId === meId);
  const myPicks = myRow ? picksByEntry.get(myRow.entryId) ?? [] : [];

  const statCells: StatCell[] = [
    { label: "Entries", value: contest.entryCount.toString() },
    {
      label: "Median return",
      value: formatReturnPct(stats.medianReturn),
      tone: returnTone(stats.medianReturn),
    },
    {
      label: "Top return",
      value: formatReturnPct(stats.topReturn),
      tone: returnTone(stats.topReturn),
    },
    {
      label: "NIFTY 50",
      value: indexChange ? formatReturnPct(indexChange.change) : "—",
      tone: indexChange ? returnTone(indexChange.change) : "neutral",
    },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <Link
        href="/contests"
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All contests
      </Link>

      <ContestDetailHeader
        contest={contest}
        statusLabel="Final"
        statusTone="resolved"
        subtitle={
          <span className="tabular-nums">
            Resolved {formatTimeSince(contest.resolvesAt)}
          </span>
        }
        stats={statCells}
      />

      <CrowdSection stats={stats} />

      {myRow && (
        <YourResult
          rank={myRow.rank}
          finalReturn={myRow.finalReturn}
          ratingDelta={myRow.ratingDelta}
          picks={myPicks}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-1">
          Leaderboard
        </h2>
        <ContestLeaderboardTable
          rows={leaderboard}
          picksByEntry={picksByEntry}
          currentUserId={meId}
        />
      </section>
    </main>
  );
}

async function LiveView({
  contest,
  meId,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getContestBySlug>>>;
  meId: string | null;
}) {
  const symbols = NIFTY_50.map((s) => s.symbol);
  const [entries, livePicks, livePriceBySymbol, indexLast] = await Promise.all([
    getContestEntriesWithUsers(contest.id),
    getContestLivePicks(contest.id),
    fetchLastPrices(symbols),
    fetchIndexLastPrice(),
  ]);

  // Compute live return per entry; build LeaderboardRow + PickWithReturn shapes
  // so the leaderboard component can be re-used unchanged.
  type ComputedRow = {
    row: LeaderboardRow;
    picks: PickWithReturn[];
  };
  const computed: ComputedRow[] = entries.map((e) => {
    const picks = livePicks.get(e.entryId) ?? [];
    const enrichedPicks: PickWithReturn[] = picks
      .map((p): PickWithReturn | null => {
        const last = livePriceBySymbol.get(p.symbol);
        if (last == null) return null;
        const returnPct = (last - p.entryPrice) / p.entryPrice;
        return {
          symbol: p.symbol,
          entryPrice: p.entryPrice,
          exitPrice: last,
          returnPct,
        };
      })
      .filter((p): p is PickWithReturn => p !== null);
    const liveReturn =
      enrichedPicks.length === 0
        ? 0
        : enrichedPicks.reduce((sum, p) => sum + p.returnPct, 0) /
          enrichedPicks.length;
    return {
      row: {
        entryId: e.entryId,
        rank: 0, // backfilled below
        finalReturn: liveReturn,
        ratingDelta: 0,
        userId: e.userId,
        firstName: e.firstName,
        lastName: e.lastName,
        username: e.username,
        avatarUrl: e.avatarUrl,
      },
      picks: enrichedPicks,
    };
  });
  computed.sort((a, b) => b.row.finalReturn - a.row.finalReturn);
  computed.forEach((c, i) => {
    c.row.rank = i + 1;
  });

  const leaderboardRows = computed.map((c) => c.row);
  const picksByEntry = new Map(computed.map((c) => [c.row.entryId, c.picks]));
  const myRow = leaderboardRows.find((r) => r.userId === meId);
  const myPicks = myRow ? picksByEntry.get(myRow.entryId) ?? [] : [];

  // Live stats — computed in memory, no extra queries.
  const validReturns = leaderboardRows.map((r) => r.finalReturn);
  validReturns.sort((a, b) => a - b);
  const median =
    validReturns.length > 0
      ? validReturns[Math.floor(validReturns.length / 2)]
      : 0;
  const top = validReturns.length > 0 ? validReturns[validReturns.length - 1] : 0;
  const indexChange = indexLast
    ? (indexLast.regular - indexLast.previous) / indexLast.previous
    : null;

  const statCells: StatCell[] = [
    { label: "Entries", value: contest.entryCount.toString() },
    {
      label: "Live median",
      value: formatReturnPct(median),
      tone: returnTone(median),
    },
    {
      label: "Live top",
      value: formatReturnPct(top),
      tone: returnTone(top),
    },
    {
      label: "NIFTY 50 today",
      value: indexChange != null ? formatReturnPct(indexChange) : "—",
      tone: indexChange != null ? returnTone(indexChange) : "neutral",
    },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <Link
        href="/contests"
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All contests
      </Link>

      <ContestDetailHeader
        contest={contest}
        statusLabel="Live"
        statusTone="live"
        subtitle={
          <ContestCountdown locksAtISO={contest.resolvesAt.toISOString()} />
        }
        stats={statCells}
      />

      <p className="text-xs text-zinc-600 tabular-nums">
        Prices refresh every 60s on page reload.
      </p>

      {myRow && (
        <YourResultLive
          rank={myRow.rank}
          totalEntries={leaderboardRows.length}
          liveReturn={myRow.finalReturn}
          picks={myPicks}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-1">
          Live leaderboard
        </h2>
        {leaderboardRows.length === 0 ? (
          <p className="text-sm text-zinc-600 border border-dashed border-zinc-900 rounded-lg p-4">
            No entries this week.
          </p>
        ) : (
          <ContestLeaderboardTable
            rows={leaderboardRows}
            picksByEntry={picksByEntry}
            currentUserId={meId}
            showDelta={false}
          />
        )}
      </section>
    </main>
  );
}

function CrowdSection({
  stats,
}: {
  stats: Awaited<ReturnType<typeof getContestStats>>;
}) {
  const totalPicks = stats.mostPicked.reduce((acc, p) => acc + p.count, 0);
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-1">
        Crowd
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card label="Most picked">
          <ul className="space-y-1">
            {stats.mostPicked.map((p) => {
              const name = NIFTY_50.find((s) => s.symbol === p.symbol)?.name;
              return (
                <li
                  key={p.symbol}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="text-sm font-medium tabular-nums truncate">
                    {p.symbol}
                  </span>
                  <span className="text-xs text-zinc-500 truncate flex-1 min-w-0">
                    {name}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-600">
                    {p.count}
                  </span>
                </li>
              );
            })}
          </ul>
          {totalPicks > 0 && (
            <p className="text-[10px] text-zinc-700 mt-2 tabular-nums">
              of {totalPicks} total picks
            </p>
          )}
        </Card>
        <Card label="Best stock">
          {stats.bestStock ? (
            <StockReturn
              symbol={stats.bestStock.symbol}
              returnPct={stats.bestStock.returnPct}
            />
          ) : (
            <Empty />
          )}
        </Card>
        <Card label="Worst stock">
          {stats.worstStock ? (
            <StockReturn
              symbol={stats.worstStock.symbol}
              returnPct={stats.worstStock.returnPct}
            />
          ) : (
            <Empty />
          )}
        </Card>
      </div>
    </section>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-900 rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function StockReturn({
  symbol,
  returnPct,
}: {
  symbol: string;
  returnPct: number;
}) {
  const name = NIFTY_50.find((s) => s.symbol === symbol)?.name;
  const tone = returnPct >= 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium tabular-nums">{symbol}</p>
      {name && <p className="text-xs text-zinc-500 truncate">{name}</p>}
      <p className={`text-lg font-medium tabular-nums ${tone}`}>
        {formatReturnPct(returnPct)}
      </p>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-zinc-600">—</p>;
}

function YourResult({
  rank,
  finalReturn,
  ratingDelta,
  picks,
}: {
  rank: number;
  finalReturn: number;
  ratingDelta: number;
  picks: PickWithReturn[];
}) {
  const returnTone =
    finalReturn > 0
      ? "text-emerald-400"
      : finalReturn < 0
        ? "text-red-400"
        : "text-zinc-300";
  const deltaTone =
    ratingDelta > 0
      ? "text-emerald-400"
      : ratingDelta < 0
        ? "text-red-400"
        : "text-zinc-500";
  return (
    <section className="border border-zinc-900 rounded-lg p-5 space-y-3 bg-zinc-950/40">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Your result
      </p>
      <div className="flex items-baseline gap-6 flex-wrap">
        <Stat label="Finish" value={`#${rank}`} />
        <Stat
          label="Return"
          value={formatReturnPct(finalReturn)}
          toneClass={returnTone}
        />
        <Stat
          label="Δ rating"
          value={formatRatingDelta(ratingDelta)}
          toneClass={deltaTone}
        />
      </div>
      <PicksRow picks={picks} />
    </section>
  );
}

function YourResultLive({
  rank,
  totalEntries,
  liveReturn,
  picks,
}: {
  rank: number;
  totalEntries: number;
  liveReturn: number;
  picks: PickWithReturn[];
}) {
  const returnTone =
    liveReturn > 0
      ? "text-emerald-400"
      : liveReturn < 0
        ? "text-red-400"
        : "text-zinc-300";
  return (
    <section className="border border-emerald-900/40 rounded-lg p-5 space-y-3 bg-emerald-950/10">
      <p className="text-[10px] uppercase tracking-wide text-emerald-400">
        Your position (live)
      </p>
      <div className="flex items-baseline gap-6 flex-wrap">
        <Stat label="Rank" value={`#${rank}`} subtitle={`/ ${totalEntries}`} />
        <Stat
          label="Live return"
          value={formatReturnPct(liveReturn)}
          toneClass={returnTone}
        />
      </div>
      <PicksRow picks={picks} />
    </section>
  );
}

function Stat({
  label,
  value,
  subtitle,
  toneClass = "text-zinc-100",
}: {
  label: string;
  value: string;
  subtitle?: string;
  toneClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className={`text-xl font-medium tabular-nums ${toneClass}`}>
        {value}
        {subtitle && (
          <span className="text-xs text-zinc-600 ml-1">{subtitle}</span>
        )}
      </p>
    </div>
  );
}

function PicksRow({ picks }: { picks: PickWithReturn[] }) {
  if (picks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {picks.map((p) => {
        const tone =
          p.returnPct > 0
            ? "text-emerald-400 border-emerald-900/60"
            : p.returnPct < 0
              ? "text-red-400 border-red-900/60"
              : "text-zinc-400 border-zinc-800";
        return (
          <span
            key={p.symbol}
            className={`inline-flex items-baseline gap-2 text-xs tabular-nums border ${tone} rounded-md px-2 py-1`}
          >
            <span className="font-medium">{p.symbol}</span>
            <span>{formatReturnPct(p.returnPct)}</span>
          </span>
        );
      })}
    </div>
  );
}
