import Link from "next/link";
import { getCurrentUser } from "@/lib/repository/users";
import {
  getLiveContests,
  getMyResultsForContests,
  getPastContests,
  getUpcomingContests,
} from "@/lib/repository/contests";
import { ContestCountdown } from "@/components/contest-countdown";
import { ContestRow } from "@/components/contest-row";
import { ContestFormatChips } from "@/components/contest-format-chips";
import { formatPeriod } from "@/lib/contest-display";
import type { Contest } from "@/lib/repository/contests";

export default async function ContestsPage() {
  const me = await getCurrentUser();

  const [live, upcoming, past] = await Promise.all([
    getLiveContests(),
    getUpcomingContests(),
    getPastContests({ limit: 10 }),
  ]);

  const myResults = me
    ? await getMyResultsForContests(
        me.id,
        past.map((c) => c.id),
      )
    : new Map();

  // Headline contest: live wins over upcoming.
  const headlineLive = live[0] ?? null;
  const headlineUpcoming = !headlineLive ? (upcoming[0] ?? null) : null;
  const headline = headlineLive ?? headlineUpcoming;

  // Anything else upcoming becomes a small list below the hero. If a live
  // contest is the headline, every upcoming contest is "additional."
  const secondaryUpcoming = headlineLive ? upcoming : upcoming.slice(1);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight">Contests</h1>
        <p className="text-sm text-zinc-500">
          The weekly NIFTY 50 pick-five. More formats coming.
        </p>
      </header>

      {headline ? (
        <HeroCard contest={headline} isLive={!!headlineLive} />
      ) : (
        <NoContestState />
      )}

      <HowItWorks />

      {secondaryUpcoming.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Upcoming" count={secondaryUpcoming.length} />
          <ul className="space-y-2">
            {secondaryUpcoming.map((c) => (
              <li key={c.id}>
                <ContestRow contest={c} tone="upcoming" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader label="Past" count={past.length} />
        {past.length === 0 ? (
          <EmptyHint>
            No contests have resolved yet — yours will be the first.
          </EmptyHint>
        ) : (
          <ul className="space-y-2">
            {past.map((c) => (
              <li key={c.id}>
                <ContestRow
                  contest={c}
                  tone="past"
                  myResult={myResults.get(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function HeroCard({ contest, isLive }: { contest: Contest; isLive: boolean }) {
  return (
    <section className="border border-zinc-900 rounded-lg p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live now
          </span>
        ) : (
          <span className="text-zinc-300">Open for entries</span>
        )}
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-500">{formatPeriod(contest.periodStart)}</span>
      </div>

      <ContestFormatChips format={contest.format} />

      <div className="space-y-2">
        <p className="text-3xl font-medium tabular-nums">
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

      <div className="flex items-center gap-4 pt-2">
        <Link
          href={`/contests/${contest.slug}`}
          className="inline-block bg-white text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 rounded-md px-5 py-2.5 text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          {isLive ? "See live standings →" : "Enter this contest →"}
        </Link>
        <Link
          href="/rules"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Rules →
        </Link>
      </div>
    </section>
  );
}

function NoContestState() {
  return (
    <section className="border border-dashed border-zinc-900 rounded-lg p-6 sm:p-8 space-y-2">
      <p className="text-sm text-zinc-300">
        No contest is scheduled right now.
      </p>
      <p className="text-sm text-zinc-500">
        Next week&apos;s contest will appear here once the previous one
        resolves (Fridays at 15:30 IST).
      </p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="space-y-4">
      <SectionHeader label="How a contest works" />
      <ol className="grid sm:grid-cols-3 gap-3">
        <Step
          n={1}
          title="Pick"
          body="Choose 5 stocks from the NIFTY 50 before the contest locks. Equal weight, no shorts, no allocation."
        />
        <Step
          n={2}
          title="Lock"
          body="Entries close at Monday 09:15 IST when the market opens. Entry prices are captured at the open."
        />
        <Step
          n={3}
          title="Resolve"
          body="Friday 15:30 IST, your portfolio return ranks you. Rating moves up or down."
        />
      </ol>
    </section>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="border border-zinc-900 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-zinc-600">
          0{n}
        </span>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
    </li>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-900 pb-1">
      <h2 className="text-xs uppercase tracking-wide text-zinc-500">{label}</h2>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-zinc-600">{count}</span>
      )}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-zinc-600 border border-dashed border-zinc-900 rounded-lg p-4">
      {children}
    </p>
  );
}
