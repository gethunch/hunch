import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getTopUsers } from "@/lib/repository/users";
import { resolveAvatarUrl } from "@/lib/avatars";

export default async function LeaderboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const top = await getTopUsers(50);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-medium">Leaderboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Top players by rating, updated weekly.
        </p>
      </header>

      {top.length === 0 ? (
        <section className="border border-zinc-900 rounded-lg p-8 text-center">
          <p className="text-zinc-400">No players yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Be the first — the leaderboard fills in once contests resolve.
          </p>
        </section>
      ) : (
        <ol className="border border-zinc-900 rounded-lg divide-y divide-zinc-900">
          {top.map((u, i) => {
            const isMe = u.id === me.id;
            const fullName =
              [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
              u.username ||
              "Player";
            const href = u.username ? `/profile/${u.username}` : "#";
            return (
              <li key={u.id}>
                <Link
                  href={href}
                  className={
                    "flex items-center gap-4 px-4 py-3 transition-colors " +
                    (isMe ? "bg-zinc-900/50" : "hover:bg-zinc-950")
                  }
                >
                  <span className="text-sm tabular-nums text-zinc-500 w-6">
                    {i + 1}
                  </span>
                  <Image
                    src={resolveAvatarUrl(u.avatarUrl)}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="rounded-full border border-zinc-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {fullName}
                      {isMe && (
                        <span className="text-xs text-zinc-600 ml-2">you</span>
                      )}
                    </p>
                    {u.username && (
                      <p className="text-xs text-zinc-600 truncate">
                        @{u.username}
                      </p>
                    )}
                  </div>
                  <span className="text-sm tabular-nums text-zinc-200">
                    {u.rating.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-600 w-20 text-right">
                    {u.contestsPlayed}{" "}
                    {u.contestsPlayed === 1 ? "contest" : "contests"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
