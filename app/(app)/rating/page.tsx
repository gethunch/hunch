import Image from "next/image";
import Link from "next/link";
import {
  getCurrentUser,
  getLeaderboardPage,
  getUserRatingAggregates,
  searchUsers,
  type AppUser,
  type UserRatingAggregates,
} from "@/lib/repository/users";
import { resolveAvatarUrl } from "@/lib/avatars";
import { formatRatingDelta } from "@/lib/contest-display";

const PAGE_SIZE = 50;

interface SearchParams {
  page?: string;
  q?: string;
}

export default async function RatingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const me = await getCurrentUser();

  if (search) {
    const results = await searchUsers(search, 25);
    const aggregates = await getUserRatingAggregates(results.map((u) => u.id));
    return (
      <Shell search={search}>
        <SearchSummary q={search} count={results.length} />
        <UserTable
          rows={results}
          me={me}
          aggregates={aggregates}
          showRank={false}
        />
      </Shell>
    );
  }

  const offset = (page - 1) * PAGE_SIZE;
  const { rows, total } = await getLeaderboardPage({
    offset,
    limit: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * PAGE_SIZE;
  const showingFrom = total === 0 ? 0 : safeOffset + 1;
  const showingTo = Math.min(safeOffset + rows.length, total);

  const aggregates = await getUserRatingAggregates(rows.map((u) => u.id));

  return (
    <Shell search="">
      {total === 0 ? (
        <EmptyState mode="empty" />
      ) : (
        <>
          <p className="text-xs text-zinc-500 tabular-nums">
            Showing {showingFrom}–{showingTo} of {total}{" "}
            {total === 1 ? "ranked player" : "ranked players"}
          </p>
          <UserTable
            rows={rows}
            me={me}
            aggregates={aggregates}
            showRank
            rankOffset={safeOffset}
          />
          {totalPages > 1 && (
            <Pagination page={safePage} totalPages={totalPages} />
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({
  search,
  children,
}: {
  search: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight">Rating</h1>
        <p className="text-sm text-zinc-500">
          Players ranked by rating. Updated as contests resolve.
        </p>
      </header>
      <SearchBar initialValue={search} />
      {children}
    </main>
  );
}

function SearchBar({ initialValue }: { initialValue: string }) {
  return (
    <form method="get" action="/rating" className="relative">
      <input
        type="text"
        name="q"
        defaultValue={initialValue}
        aria-label="Find a player by username or name"
        placeholder="Find a player by username or name…"
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-black border border-zinc-900 rounded-lg pl-10 pr-24 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
      />
      <SearchIcon />
      {initialValue ? (
        <Link
          href="/rating"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </Link>
      ) : (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-zinc-700 border border-zinc-900 rounded px-1.5 py-0.5">
          Enter
        </span>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SearchSummary({ q, count }: { q: string; count: number }) {
  return (
    <p className="text-xs text-zinc-500 tabular-nums">
      {count === 0
        ? `No players match "${q}".`
        : `${count} ${count === 1 ? "match" : "matches"} for "${q}"`}
    </p>
  );
}

function EmptyState({ mode }: { mode: "empty" | "search" }) {
  if (mode === "search") {
    return (
      <section className="border border-dashed border-zinc-900 rounded-lg p-6 text-center space-y-1">
        <p className="text-sm text-zinc-300">No matches.</p>
        <p className="text-xs text-zinc-600">
          That player may not have signed up yet — check the spelling.
        </p>
      </section>
    );
  }
  return (
    <section className="border border-zinc-900 rounded-lg p-8 text-center space-y-1">
      <p className="text-zinc-400">No players yet.</p>
      <p className="text-xs text-zinc-600">
        Be the first — this fills in once contests resolve.
      </p>
    </section>
  );
}

function UserTable({
  rows,
  me,
  aggregates,
  showRank,
  rankOffset = 0,
}: {
  rows: AppUser[];
  me: AppUser | null;
  aggregates: Map<string, UserRatingAggregates>;
  showRank: boolean;
  rankOffset?: number;
}) {
  if (rows.length === 0) {
    return <EmptyState mode="search" />;
  }
  return (
    <div className="border border-zinc-900 rounded-lg overflow-hidden">
      <TableHeader showRank={showRank} />
      <ol className="divide-y divide-zinc-900">
        {rows.map((u, i) => (
          <UserRow
            key={u.id}
            user={u}
            isMe={!!me && u.id === me.id}
            rank={showRank ? rankOffset + i + 1 : null}
            aggregates={aggregates.get(u.id) ?? null}
          />
        ))}
      </ol>
    </div>
  );
}

function TableHeader({ showRank }: { showRank: boolean }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 text-[10px] uppercase tracking-wide text-zinc-600 border-b border-zinc-900 bg-zinc-950/40">
      {showRank && <span className="w-7">#</span>}
      <span className="w-7 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">Player</span>
      <span className="w-16 text-right">Rating</span>
      <span className="hidden sm:inline-block w-14 text-right">Last Δ</span>
      <span className="hidden sm:inline-block w-14 text-right">Peak</span>
      <span className="hidden sm:inline-block w-20 text-right">Contests</span>
    </div>
  );
}

function UserRow({
  user,
  isMe,
  rank,
  aggregates,
}: {
  user: AppUser;
  isMe: boolean;
  rank: number | null;
  aggregates: UserRatingAggregates | null;
}) {
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    "Player";
  const href = user.username ? `/profile/${user.username}` : "#";
  const isRanked = user.contestsPlayed > 0;

  return (
    <li>
      <Link
        href={href}
        className={
          "flex items-center gap-4 px-4 py-3 transition-colors " +
          (isMe ? "bg-zinc-900/50" : "hover:bg-zinc-950")
        }
      >
        {rank !== null && (
          <span className="text-sm tabular-nums text-zinc-500 w-7">
            {rank}
          </span>
        )}
        <Image
          src={resolveAvatarUrl(user.avatarUrl, user.id)}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="rounded-full border border-zinc-800 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate text-zinc-100">
            {fullName}
            {isMe && (
              <span className="text-xs text-zinc-600 ml-2">you</span>
            )}
          </p>
          {user.username && (
            <p className="text-xs text-zinc-600 truncate">@{user.username}</p>
          )}
        </div>
        <span className="text-sm tabular-nums text-zinc-200 w-16 text-right">
          {isRanked ? user.rating.toLocaleString("en-IN") : "—"}
        </span>
        <span className="hidden sm:inline-block w-14 text-right tabular-nums text-sm">
          <DeltaCell delta={aggregates?.lastDelta ?? null} />
        </span>
        <span className="hidden sm:inline-block w-14 text-right tabular-nums text-sm text-zinc-400">
          {aggregates ? aggregates.peak.toLocaleString("en-IN") : "—"}
        </span>
        <span className="hidden sm:inline-block w-20 text-right text-xs tabular-nums text-zinc-600">
          {isRanked
            ? `${user.contestsPlayed} ${user.contestsPlayed === 1 ? "contest" : "contests"}`
            : "—"}
        </span>
      </Link>
    </li>
  );
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-zinc-700">—</span>;
  if (delta === 0) return <span className="text-zinc-500">0</span>;
  const tone = delta > 0 ? "text-emerald-400" : "text-red-400";
  return <span className={tone}>{formatRatingDelta(delta)}</span>;
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const prevHref = page > 1 ? `/rating?page=${page - 1}` : null;
  const nextHref = page < totalPages ? `/rating?page=${page + 1}` : null;
  return (
    <nav className="flex items-center justify-between text-sm pt-2">
      {prevHref ? (
        <Link
          href={prevHref}
          className="text-zinc-300 hover:text-white transition-colors"
        >
          ← Previous
        </Link>
      ) : (
        <span className="text-zinc-700">← Previous</span>
      )}
      <span className="text-xs tabular-nums text-zinc-500">
        Page {page} of {totalPages}
      </span>
      {nextHref ? (
        <Link
          href={nextHref}
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="text-zinc-700">Next →</span>
      )}
    </nav>
  );
}
