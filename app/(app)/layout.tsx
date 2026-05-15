import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import { resolveAvatarUrl } from "@/lib/avatars";
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
            {user && !onOnboarding && user.username && (
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors tabular-nums"
              >
                <Image
                  src={resolveAvatarUrl(user.avatarUrl)}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="rounded-full border border-zinc-800"
                />
                <span className="hidden sm:inline">
                  {[user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ") || user.username}
                </span>
                <span className="text-zinc-700 mx-1 hidden sm:inline">·</span>
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
