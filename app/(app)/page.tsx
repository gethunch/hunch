import Image from "next/image";
import Link from "next/link";
import { getTopUsers } from "@/lib/repository/users";
import {
  getContestStats,
  getLiveContests,
  getPastContests,
  getUpcomingContests,
} from "@/lib/repository/contests";
import { ContestCountdown } from "@/components/contest-countdown";
import { ContestFormatChips } from "@/components/contest-format-chips";
import { HunchMark } from "@/components/hunch-mark";
import { resolveAvatarUrl } from "@/lib/avatars";
import { NIFTY_50 } from "@/lib/constants";
import {
  formatPeriod,
  formatReturnPct,
} from "@/lib/contest-display";

export default async function Home() {
  const [live, upcoming, past, top] = await Promise.all([
    getLiveContests(),
    getUpcomingContests(),
    getPastContests({ limit: 1 }),
    getTopUsers(5),
  ]);

  const thisWeek = live[0] ?? upcoming[0] ?? null;
  const isLive = !!(live[0] && thisWeek && live[0].id === thisWeek.id);
  const lastWeek = past[0] ?? null;
  const lastWeekStats = lastWeek ? await getContestStats(lastWeek.id) : null;

  return (
    <main>
      <Hero thisWeekSlug={thisWeek?.slug ?? null} />
      <div className="max-w-3xl mx-auto px-6 space-y-24 pb-32">
        {thisWeek && (
          <ThisWeekSection contest={thisWeek} isLive={isLive} />
        )}
        {top.length > 0 && <TopRatedSection users={top} />}
        {lastWeek && lastWeekStats && (
          <LastWeekSection contest={lastWeek} stats={lastWeekStats} />
        )}
        <ComingSoonSection />
        <HowItWorksSection />
      </div>
      <Footer />
    </main>
  );
}

function Hero({ thisWeekSlug }: { thisWeekSlug: string | null }) {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-24 pb-32 sm:pt-32 sm:pb-40 text-center">
      <div className="flex justify-center mb-10 text-zinc-100">
        <HunchMark size={64} withFrame />
      </div>
      <h1 className="text-5xl sm:text-7xl font-medium tracking-tight leading-[1.05]">
        Got a hunch?
        <br />
        <span className="text-zinc-500">Prove it.</span>
      </h1>
      <p className="text-lg sm:text-xl text-zinc-400 mt-8 max-w-xl mx-auto leading-relaxed">
        A skill-rated prediction ladder on Indian stocks. Enter each contest,
        earn a rating that tracks your real skill. No money. No noise.
      </p>
      <div className="mt-12 flex items-center justify-center gap-4">
        <Link
          href={thisWeekSlug ? `/contests/${thisWeekSlug}` : "/contests"}
          className="inline-block bg-white text-black rounded-md px-6 py-3 text-base font-medium hover:bg-zinc-200 transition-colors"
        >
          {thisWeekSlug ? "Enter this contest →" : "Browse contests →"}
        </Link>
        <Link
          href="/rating"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          See the ladder →
        </Link>
      </div>
      <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-wide text-zinc-600 mt-16">
        <span className="text-zinc-400">Pick</span>
        <span className="text-zinc-800">→</span>
        <span className="text-zinc-400">Wait</span>
        <span className="text-zinc-800">→</span>
        <span className="text-zinc-400">Rate</span>
      </div>
    </section>
  );
}

function ThisWeekSection({
  contest,
  isLive,
}: {
  contest: NonNullable<Awaited<ReturnType<typeof getLiveContests>>>[number];
  isLive: boolean;
}) {
  return (
    <section className="space-y-4">
      <SectionLabel>{isLive ? "Live now" : "Up next"}</SectionLabel>
      <div className="border border-zinc-900 rounded-lg p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-zinc-300">Open for entries</span>
          )}
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{formatPeriod(contest.periodStart)}</span>
        </div>
        <ContestFormatChips format={contest.format} />
        <div className="space-y-2">
          <p className="text-2xl sm:text-3xl font-medium tabular-nums">
            {contest.entryCount}{" "}
            <span className="text-zinc-500 text-base font-normal">
              {contest.entryCount === 1 ? "entry" : "entries"} so far
            </span>
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
          href={`/contests/${contest.slug}`}
          className="inline-block text-sm bg-white text-black rounded-md px-4 py-2 font-medium hover:bg-zinc-200 transition-colors"
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
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Top rated</SectionLabel>
        <Link
          href="/rating"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Full ratings →
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
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900 transition-colors"
              >
                <span className="text-sm tabular-nums text-zinc-500 w-5">
                  {i + 1}
                </span>
                <Image
                  src={resolveAvatarUrl(u.avatarUrl, u.id)}
                  alt=""
                  width={32}
                  height={32}
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
    <section className="space-y-4">
      <SectionLabel>Last contest</SectionLabel>
      <div className="border border-zinc-900 rounded-lg p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <span className="text-zinc-500">Final</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{formatPeriod(contest.periodStart)}</span>
        </div>
        <ContestFormatChips format={contest.format} />
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
            <span className="text-zinc-200 tabular-nums">{topPick.symbol}</span>
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
    <div className="bg-black p-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
        {label}
      </p>
      <p className={`text-base font-medium tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

interface UpcomingFeature {
  title: string;
  description: string;
}

const UPCOMING: UpcomingFeature[] = [
  {
    title: "More contest formats",
    description:
      "Daily picks, fixed-allocation portfolios, variable-N shortlists — same rating, different cadences.",
  },
  {
    title: "Live rank alerts",
    description:
      "Mid-contest digests when your rank shifts. Find out you climbed from 14 → 4 without checking.",
  },
  {
    title: "Rating tiers",
    description:
      "Color-coded titles — Pupil, Specialist, Expert, Master, Grandmaster. Status that scans at a glance.",
  },
  {
    title: "Share cards",
    description:
      "One-tap WhatsApp / X share for your picks and your final result. Drag a friend in.",
  },
  {
    title: "Private leagues",
    description:
      "Invite-only contests where you compete just with your office or college group.",
  },
];

function ComingSoonSection() {
  return (
    <section className="space-y-4">
      <SectionLabel>Coming soon</SectionLabel>
      <ul className="border border-zinc-900 rounded-lg divide-y divide-zinc-900">
        {UPCOMING.map((f) => (
          <li
            key={f.title}
            className="px-4 sm:px-5 py-4 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {f.description}
              </p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500 border border-zinc-800 rounded-full px-2 py-0.5 mt-0.5">
              Soon
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="space-y-4">
      <SectionLabel>How it works</SectionLabel>
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed max-w-xl">
        <p>
          Each contest opens, you submit your shortlist before lock time, then
          wait for the market to do its thing. When it resolves, your portfolio
          return ranks you against everyone who entered.
        </p>
        <p>
          Top 1% gets +50 rating. Median is 0. Bottom 1% is −50. Higher-rated
          players earn less for the same finish — the ladder gets steeper at
          the top.
        </p>
        <p className="text-zinc-300">
          No real money. No prizes. The rating is the reward.
        </p>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-900 pb-2">
      {children}
    </h2>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-900 py-10">
      <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-600">
        <span className="inline-flex items-center gap-2">
          <HunchMark size={14} />
          <span>Skill-rated prediction. Got a hunch? Prove it.</span>
        </span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
