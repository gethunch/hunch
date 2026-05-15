import Link from "next/link";
import { getCurrentUser } from "@/lib/repository/users";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <>
      <nav className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
          <Link
            href="/contest"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Contest
          </Link>
          <Link
            href="/leaderboard"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Leaderboard
          </Link>
          {user && (
            <Link
              href={`/profile/${user.id}`}
              className="ml-auto text-zinc-500 hover:text-zinc-200 transition-colors tabular-nums"
            >
              <span className="hidden sm:inline">{user.displayName}</span>
              <span className="text-zinc-700 mx-2 hidden sm:inline">·</span>
              <span className="text-zinc-300">
                {user.rating.toLocaleString("en-IN")}
              </span>
            </Link>
          )}
        </div>
      </nav>
      {children}
    </>
  );
}
