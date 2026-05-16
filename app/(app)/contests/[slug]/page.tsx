import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import {
  getContestBySlug,
  getContestLeaderboard,
  getContestPicks,
  getContestStats,
} from "@/lib/repository/contests";
import { fetchIndexWeeklyChange } from "@/lib/market";
import { NIFTY_50 } from "@/lib/constants";
import {
  ContestDetailHeader,
  type StatCell,
  returnTone,
} from "@/components/contest-detail-header";
import { ContestLeaderboardTable } from "@/components/contest-leaderboard-table";
import {
  formatRatingDelta,
  formatReturnPct,
} from "@/lib/contest-display";

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) notFound();

  if (contest.status === "resolved") {
    return <ResolvedView contest={contest} meId={me.id} />;
  }

  // Phase 14 (live) + Phase 15 (open / entry) land next.
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
      <h1 className="text-2xl font-medium">
        Contest &quot;{slug}&quot; — {contest.status}
      </h1>
      <p className="text-sm text-zinc-500">
        Live + entry views land in the next phases.
      </p>
    </main>
  );
}

async function ResolvedView({
  contest,
  meId,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getContestBySlug>>>;
  meId: string;
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
  picks: Awaited<ReturnType<typeof getContestPicks>> extends Map<
    string,
    infer V
  >
    ? V
    : never;
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
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">
            Finish
          </p>
          <p className="text-xl font-medium tabular-nums">#{rank}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">
            Return
          </p>
          <p className={`text-xl font-medium tabular-nums ${returnTone}`}>
            {formatReturnPct(finalReturn)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">
            Δ rating
          </p>
          <p className={`text-xl font-medium tabular-nums ${deltaTone}`}>
            {formatRatingDelta(ratingDelta)}
          </p>
        </div>
      </div>
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
    </section>
  );
}
