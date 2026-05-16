import Image from "next/image";
import Link from "next/link";
import { resolveAvatarUrl } from "@/lib/avatars";
import {
  formatRatingDelta,
  formatReturnPct,
} from "@/lib/contest-display";
import { NIFTY_50 } from "@/lib/constants";
import type {
  LeaderboardRow,
  PickWithReturn,
} from "@/lib/repository/contests";

interface Props {
  rows: LeaderboardRow[];
  picksByEntry: Map<string, PickWithReturn[]>;
  currentUserId?: string | null;
  showDelta?: boolean;
}

export function ContestLeaderboardTable({
  rows,
  picksByEntry,
  currentUserId,
  showDelta = true,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-600 border border-dashed border-zinc-900 rounded-lg p-4">
        No entries yet.
      </p>
    );
  }
  return (
    <ol className="border border-zinc-900 rounded-lg divide-y divide-zinc-900">
      {rows.map((row) => (
        <li key={row.entryId}>
          <Row
            row={row}
            picks={picksByEntry.get(row.entryId) ?? []}
            isMe={!!currentUserId && row.userId === currentUserId}
            showDelta={showDelta}
          />
        </li>
      ))}
    </ol>
  );
}

function Row({
  row,
  picks,
  isMe,
  showDelta,
}: {
  row: LeaderboardRow;
  picks: PickWithReturn[];
  isMe: boolean;
  showDelta: boolean;
}) {
  const fullName =
    [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
    row.username ||
    "Player";
  const href = row.username ? `/profile/${row.username}` : null;
  const returnTone =
    row.finalReturn > 0
      ? "text-emerald-400"
      : row.finalReturn < 0
        ? "text-red-400"
        : "text-zinc-300";
  const deltaTone =
    row.ratingDelta > 0
      ? "text-emerald-400"
      : row.ratingDelta < 0
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <details className={isMe ? "bg-zinc-900/40" : ""}>
      <summary className="flex items-center gap-4 px-4 py-3 cursor-pointer list-none hover:bg-zinc-900">
        <span className="text-sm tabular-nums text-zinc-500 w-7">
          {row.rank}
        </span>
        <Image
          src={resolveAvatarUrl(row.avatarUrl, row.userId)}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="rounded-full border border-zinc-800 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            {href ? (
              <Link href={href} className="hover:underline">
                {fullName}
              </Link>
            ) : (
              fullName
            )}
            {isMe && (
              <span className="text-xs text-zinc-600 ml-2">you</span>
            )}
          </p>
          {row.username && (
            <p className="text-xs text-zinc-600 truncate">@{row.username}</p>
          )}
        </div>
        <span
          className={`text-sm tabular-nums ${returnTone} w-20 text-right`}
        >
          {formatReturnPct(row.finalReturn)}
        </span>
        {showDelta && (
          <span
            className={`text-sm tabular-nums ${deltaTone} w-14 text-right`}
          >
            {formatRatingDelta(row.ratingDelta)}
          </span>
        )}
      </summary>
      {picks.length > 0 && <PicksRow picks={picks} />}
    </details>
  );
}

function PicksRow({ picks }: { picks: PickWithReturn[] }) {
  return (
    <div className="px-4 pb-3 pt-1">
      <div className="flex flex-wrap gap-2 pl-11">
        {picks.map((p) => {
          const name = NIFTY_50.find((s) => s.symbol === p.symbol)?.name;
          const tone =
            p.returnPct > 0
              ? "text-emerald-400 border-emerald-900/60"
              : p.returnPct < 0
                ? "text-red-400 border-red-900/60"
                : "text-zinc-400 border-zinc-800";
          return (
            <span
              key={p.symbol}
              title={name ?? ""}
              className={`inline-flex items-baseline gap-2 text-xs tabular-nums border ${tone} rounded-md px-2 py-1`}
            >
              <span className="font-medium">{p.symbol}</span>
              <span>{formatReturnPct(p.returnPct)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
