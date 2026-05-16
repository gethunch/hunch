import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import {
  getLiveContests,
  getMyResultsForContests,
  getPastContests,
  getUpcomingContests,
} from "@/lib/repository/contests";
import { ContestRow } from "@/components/contest-row";

export default async function ContestsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [live, upcoming, past] = await Promise.all([
    getLiveContests(),
    getUpcomingContests(),
    getPastContests({ limit: 10 }),
  ]);

  const myResults = await getMyResultsForContests(
    me.id,
    past.map((c) => c.id),
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-medium">Contests</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Weekly NIFTY 50 pick-five. One contest per week.
        </p>
      </header>

      {live.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Live" count={live.length} />
          <ul className="space-y-2">
            {live.map((c) => (
              <li key={c.id}>
                <ContestRow contest={c} tone="live" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader label="Upcoming" count={upcoming.length} />
        {upcoming.length === 0 ? (
          <EmptyHint>
            Next week&apos;s contest will appear here once the previous one
            resolves.
          </EmptyHint>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li key={c.id}>
                <ContestRow contest={c} tone="upcoming" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader label="Past" count={past.length} />
        {past.length === 0 ? (
          <EmptyHint>No contests have resolved yet.</EmptyHint>
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

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-900 pb-1">
      <h2 className="text-xs uppercase tracking-wide text-zinc-500">{label}</h2>
      <span className="text-xs tabular-nums text-zinc-600">{count}</span>
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
