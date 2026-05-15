import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  // Onboarded gate: not-onboarded users see only /onboarding. Already-onboarded
  // users bounce away from it.
  if (user && !user.onboarded && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }
  if (user && user.onboarded && pathname.startsWith("/onboarding")) {
    redirect("/contest");
  }

  const onOnboarding = pathname.startsWith("/onboarding");

  return (
    <>
      <nav className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
          {!onOnboarding && (
            <>
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
            </>
          )}
          <div className="ml-auto flex items-center gap-4">
            {user && !onOnboarding && (
              <Link
                href={`/profile/${user.id}`}
                className="text-zinc-500 hover:text-zinc-200 transition-colors tabular-nums"
              >
                <span className="hidden sm:inline">
                  {user.username ?? "(setting up)"}
                </span>
                <span className="text-zinc-700 mx-2 hidden sm:inline">·</span>
                <span className="text-zinc-300">
                  {user.rating.toLocaleString("en-IN")}
                </span>
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
