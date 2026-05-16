import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getTopUsers } from "@/lib/repository/users";
import {
  getContestStats,
  getLiveContests,
  getPastContests,
  getUpcomingContests,
} from "@/lib/repository/contests";
import { ContestCountdown } from "@/components/contest-countdown";
import { resolveAvatarUrl } from "@/lib/avatars";
import { NIFTY_50 } from "@/lib/constants";
import {
  formatLabel,
  formatPeriod,
  formatReturnPct,
} from "@/lib/contest-display";

export default async function Home() {
  const me = await getCurrentUser();
  if (me) redirect("/contests");

  const [live, upcoming, past, top] = await Promise.all([
    getLiveContests(),
    getUpcomingContests(),
    getPastContests({ limit: 1 }),
    getTopUsers(5),
  ]);

  const thisWeek = live[0] ?? upcoming[0] ?? null;
  const lastWeek = past[0] ?? null;
  const lastWeekStats = lastWeek ? await getContestStats(lastWeek.id) : null;

  return (
    <>
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-base font-medium tracking-tight hover:text-zinc-300 transition-colors"
          >
            Hunch
          </Link>
          <Link
            href="/login"
            className="text-sm text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-20">
        <Hero />

        {thisWeek && (
          <ThisWeekSection
            contest={thisWeek}
            isLive={live[0]?.id === thisWeek.id}
          />
        )}

        {top.length > 0 && <TopRatedSection users={top} />}

        {lastWeek && lastWeekStats && (
          <LastWeekSection contest={lastWeek} stats={lastWeekStats} />
        )}

        <HowItWorksSection />

        <Footer />
      </main>
    </>
  );
}

function Hero() {
  return (
    <section className="text-center space-y-6 pt-8 pb-4">
      <h1 className="text-5xl sm:text-6xl font-medium tracking-tight">
        Got a hunch? Prove it.
      </h1>
      <p className="text-zinc-400 text-lg max-w-xl mx-auto">
        Pick 5 stocks every Monday. Earn a rating that tracks your skill at
        picking NIFTY 50 winners.
      </p>
      <div className="pt-2">
        <Link
          href="/login"
          className="inline-block bg-white text-black rounded-md px-6 py-3 text-base font-medium"
        >
          Sign in to play
        </Link>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs uppercase tracking-wide text-zinc-500 pt-6">
        <Step n={1} label="Pick" />
        <Arrow />
        <Step n={2} label="Wait" />
        <Arrow />
        <Step n={3} label="Rate" />
      </div>
    </section>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-zinc-700 tabular-nums">{n}</span>
      <span className="text-zinc-400">{label}</span>
    </span>
  );
}

function Arrow() {
  return <span className="text-zinc-800">→</span>;
}

function ThisWeekSection({
  contest,
  isLive,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getLiveContests>>>[number];
  isLive: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionLabel>This week</SectionLabel>
      <div className="border border-zinc-900 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-zinc-300">Open</span>
          )}
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">
            {formatLabel(contest.format)} · {formatPeriod(contest.periodStart)}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-sm tabular-nums text-zinc-300">
            {contest.entryCount}{" "}
            {contest.entryCount === 1 ? "entry" : "entries"} so far
          </p>
          <ContestCountdown
            locksAtISO={
              isLive
                ? contest.resolvesAt.toISOString()
                : contest.locksAt.toISOString()
            }
          />
        </div>
        <Link
          href={`/login?next=/contests/${contest.slug}`}
          className="inline-block text-sm bg-white text-black rounded-md px-4 py-2 font-medium"
        >
          {isLive ? "See live standings →" : "Enter this contest →"}
        </Link>
      </div>
    </section>
  );
}

function TopRatedSection({
  users,
}: {
  users: Awaited<ReturnType<typeof getTopUsers>>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Top rated</SectionLabel>
        <Link
          href="/leaderboard"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Full leaderboard →
        </Link>
      </div>
      <ol className="border border-zinc-900 rounded-lg divide-y divide-zinc-900">
        {users.map((u, i) => {
          const fullName =
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
            u.username ||
            "Player";
          const href = u.username ? `/profile/${u.username}` : "#";
          return (
            <li key={u.id}>
              <Link
                href={href}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-950 transition-colors"
              >
                <span className="text-sm tabular-nums text-zinc-500 w-5">
                  {i + 1}
                </span>
                <Image
                  src={resolveAvatarUrl(u.avatarUrl, u.id)}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="rounded-full border border-zinc-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{fullName}</p>
                  {u.username && (
                    <p className="text-xs text-zinc-600 truncate">
                      @{u.username}
                    </p>
                  )}
                </div>
                <span className="text-sm tabular-nums text-zinc-200">
                  {u.rating.toLocaleString("en-IN")}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LastWeekSection({
  contest,
  stats,
}: {
  contest: Awaited<ReturnType<typeof getPastContests>>[number];
  stats: Awaited<ReturnType<typeof getContestStats>>;
}) {
  const topPick = stats.mostPicked[0];
  const topPickName = topPick
    ? NIFTY_50.find((s) => s.symbol === topPick.symbol)?.name
    : null;
  return (
    <section className="space-y-3">
      <SectionLabel>Last week</SectionLabel>
      <div className="border border-zinc-900 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <span className="text-zinc-500">Final</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">
            {formatLabel(contest.format)} · {formatPeriod(contest.periodStart)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900 rounded-md overflow-hidden">
          <Stat label="Entries" value={contest.entryCount.toString()} />
          <Stat
            label="Median return"
            value={formatReturnPct(stats.medianReturn)}
            tone={
              stats.medianReturn > 0
                ? "positive"
                : stats.medianReturn < 0
                  ? "negative"
                  : "neutral"
            }
          />
          <Stat
            label="Top return"
            value={formatReturnPct(stats.topReturn)}
            tone={stats.topReturn > 0 ? "positive" : "neutral"}
          />
        </div>
        {topPick && (
          <p className="text-sm text-zinc-400">
            Most picked:{" "}
            <span className="text-zinc-200 tabular-nums">
              {topPick.symbol}
            </span>
            {topPickName && (
              <span className="text-zinc-500"> ({topPickName})</span>
            )}{" "}
            <span className="text-zinc-600 tabular-nums">
              · {topPick.count} entries
            </span>
          </p>
        )}
        <Link
          href={`/contests/${contest.slug}`}
          className="inline-block text-sm text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-md px-4 py-2 transition-colors"
        >
          See full results →
        </Link>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-zinc-100";
  return (
    <div className="bg-black p-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
        {label}
      </p>
      <p className={`text-base font-medium tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section className="space-y-4">
      <SectionLabel>How it works</SectionLabel>
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Every Monday at 9:15 IST, a fresh contest opens. You pick 5 NIFTY 50
          stocks. Equal weight, no shorts, no allocation. Friday close, the
          contest resolves on portfolio return.
        </p>
        <p>
          You earn a rating delta based on where you finish. Top 1% gets +50,
          median is 0, bottom 1% is −50. Higher-rated players gain less for the
          same finish — the ladder gets steeper at the top.
        </p>
        <p>
          No real money. No prizes. The rating <span className="text-zinc-200">is</span>{" "}
          the reward — a portable, honest measure of your skill at picking
          stocks.
        </p>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-1">
      {children}
    </h2>
  );
}

function Footer() {
  return (
    <footer className="pt-12 border-t border-zinc-900 text-center">
      <p className="text-xs text-zinc-700">
        Hunch — skill-rated stock prediction. Got a hunch? Prove it.
      </p>
    </footer>
  );
}
