import { notFound, redirect } from "next/navigation";
import {
  getCurrentUser,
  getRatingHistory,
  getRecentEntries,
  getUserById,
} from "@/lib/repository/users";
import { RatingChart, type RatingPoint } from "@/components/rating-chart";
import { ProfileNameEditor } from "@/components/profile-name-editor";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const [history, recent] = await Promise.all([
    getRatingHistory(id),
    getRecentEntries(id, 10),
  ]);

  const chartData: RatingPoint[] = [
    { x: "Start", rating: 1500 },
    ...history.map((h) => ({
      x: h.date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      rating: h.ratingAfter,
    })),
  ];

  const isMe = user.id === me.id;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header className="space-y-1">
        {isMe ? (
          <ProfileNameEditor initialName={user.displayName} />
        ) : (
          <h1 className="text-2xl font-medium">{user.displayName}</h1>
        )}
        <p className="text-sm tabular-nums text-zinc-400">
          <span className="text-zinc-200">
            {user.rating.toLocaleString("en-IN")}
          </span>
          <span className="text-zinc-700 mx-2">·</span>
          <span>
            {user.contestsPlayed}{" "}
            {user.contestsPlayed === 1 ? "contest" : "contests"}
          </span>
        </p>
      </header>

      <section>
        {user.contestsPlayed > 0 ? (
          <div className="border border-zinc-900 rounded-lg p-4">
            <RatingChart data={chartData} />
          </div>
        ) : (
          <div className="border border-zinc-900 rounded-lg p-8 text-center">
            <p className="text-zinc-500 text-sm">
              No contests yet. The rating chart appears after the first contest
              resolves.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Recent entries
        </h2>
        {recent.length === 0 ? (
          <p className="text-zinc-500 text-sm">No entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((e) => (
              <li
                key={e.entryId}
                className="border border-zinc-900 rounded-md p-4"
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-sm font-medium">
                    Week of {e.contestPeriodStart}
                  </span>
                  {e.finalRank != null ? (
                    <span className="text-xs tabular-nums text-zinc-500">
                      Rank {e.finalRank}
                      {e.ratingDelta != null && (
                        <span
                          className={
                            (e.ratingDelta >= 0
                              ? "text-emerald-400"
                              : "text-red-400") + " ml-2"
                          }
                        >
                          {e.ratingDelta >= 0 ? "+" : ""}
                          {e.ratingDelta}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">In progress</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {e.picks.map((s) => (
                    <span
                      key={s}
                      className="text-xs tabular-nums px-2 py-0.5 bg-zinc-900 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                {e.finalReturn != null && (
                  <p className="text-xs tabular-nums text-zinc-500 mt-3">
                    Return:{" "}
                    <span
                      className={
                        e.finalReturn >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {e.finalReturn >= 0 ? "+" : ""}
                      {(e.finalReturn * 100).toFixed(2)}%
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
