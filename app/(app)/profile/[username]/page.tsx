import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getCurrentUser,
  getRatingHistory,
  getRecentEntries,
  getUserByUsername,
} from "@/lib/repository/users";
import { resolveAvatarUrl } from "@/lib/avatars";
import { type RatingPoint } from "@/components/rating-chart";
import { ProfileTabs } from "@/components/profile-tabs";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const me = await getCurrentUser();

  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) notFound();

  const [history, recent] = await Promise.all([
    getRatingHistory(user.id),
    getRecentEntries(user.id, 10),
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

  const isMe = !!me && user.id === me.id;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    "Player";
  const avatarSrc = resolveAvatarUrl(user.avatarUrl, user.id);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <header className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full overflow-hidden border border-zinc-800 shrink-0">
          <Image src={avatarSrc} alt="" width={80} height={80} unoptimized />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-medium tracking-tight">{fullName}</h1>
          <p className="text-sm tabular-nums text-zinc-400">
            {user.username && (
              <>
                <span className="text-zinc-500">@{user.username}</span>
                <span className="text-zinc-700 mx-2">·</span>
              </>
            )}
            <span className="text-zinc-200">
              {user.rating.toLocaleString("en-IN")}
            </span>
            <span className="text-zinc-700 mx-2">·</span>
            <span>
              {user.contestsPlayed}{" "}
              {user.contestsPlayed === 1 ? "contest" : "contests"}
            </span>
          </p>
        </div>
      </header>

      <ProfileTabs
        isMe={isMe}
        chartData={chartData}
        hasContests={user.contestsPlayed > 0}
        entries={recent}
        editorUser={
          isMe
            ? {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                pendingEmail: user.pendingEmail,
                emailVerifiedAt: user.emailVerifiedAt,
                avatarUrl: user.avatarUrl,
              }
            : null
        }
      />
    </main>
  );
}
