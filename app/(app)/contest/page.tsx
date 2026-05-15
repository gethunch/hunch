import { redirect } from "next/navigation";
import { CONTEST_FORMAT_WEEKLY_PICK_5, NIFTY_50 } from "@/lib/constants";
import {
  getCurrentOpenContest,
  type Contest,
} from "@/lib/repository/contests";
import { getEntryForUser, type EntryPick } from "@/lib/repository/entries";
import { getCurrentUser } from "@/lib/repository/users";
import { PickFive } from "@/components/pick-five";

export default async function ContestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const contest = await getCurrentOpenContest(CONTEST_FORMAT_WEEKLY_PICK_5);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {!contest ? (
        <EmptyState />
      ) : (
        <ContestSection contest={contest} userId={user.id} />
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="border border-zinc-900 rounded-lg p-8 text-center">
      <h2 className="text-lg font-medium">No contest open right now</h2>
      <p className="text-sm text-zinc-500 mt-2">
        Check back when next week&apos;s contest opens.
      </p>
    </section>
  );
}

async function ContestSection({
  contest,
  userId,
}: {
  contest: Contest;
  userId: string;
}) {
  const existing = await getEntryForUser(contest.id, userId);
  const lockTime = formatIST(contest.locksAt);
  const resolveTime = formatIST(contest.resolvesAt);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-medium">
          Week of {contest.periodStart}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Picks lock {lockTime} · Resolves {resolveTime}
        </p>
      </header>

      {existing ? (
        <LockedInView picks={existing.picks} />
      ) : (
        <PickFive stocks={NIFTY_50} />
      )}
    </section>
  );
}

function LockedInView({ picks }: { picks: EntryPick[] }) {
  return (
    <div className="border border-zinc-900 rounded-lg p-6 space-y-4">
      <h3 className="text-sm font-medium text-emerald-400">
        Locked in for this week
      </h3>
      <ul className="space-y-2">
        {picks.map((p) => {
          const stock = NIFTY_50.find((s) => s.symbol === p.symbol);
          return (
            <li key={p.symbol} className="flex items-baseline gap-3">
              <span className="text-sm font-medium tabular-nums">
                {p.symbol}
              </span>
              {stock && (
                <span className="text-xs text-zinc-500">{stock.name}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-zinc-600 pt-2">
        Entry prices captured at market open. Resolution at Friday close.
      </p>
    </div>
  );
}

function formatIST(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
