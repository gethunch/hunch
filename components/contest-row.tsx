import Link from "next/link";
import {
  formatPeriod,
  formatRatingDelta,
  formatReturnPct,
  formatTimeSince,
  formatTimeUntil,
} from "@/lib/contest-display";
import { ContestFormatChips } from "@/components/contest-format-chips";
import type { Contest, ContestResultForUser } from "@/lib/repository/contests";

type Tone = "live" | "upcoming" | "past";

interface Props {
  contest: Contest;
  tone: Tone;
  myResult?: ContestResultForUser;
}

export function ContestRow({ contest, tone, myResult }: Props) {
  return (
    <Link
      href={`/contests/${contest.slug}`}
      className="block border border-zinc-900 rounded-lg p-4 hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate text-zinc-100">
              {formatPeriod(contest.periodStart)}
            </h3>
            <StatusPill tone={tone} />
          </div>
          <ContestFormatChips format={contest.format} size="sm" />
          <p className="text-xs text-zinc-500 tabular-nums">
            <SubtitleByTone contest={contest} tone={tone} myResult={myResult} />
          </p>
        </div>
        <div className="text-right shrink-0">
          <RightSlot contest={contest} tone={tone} myResult={myResult} />
        </div>
      </div>
    </Link>
  );
}

function StatusPill({ tone }: { tone: Tone }) {
  if (tone === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-400 border border-emerald-900/60 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (tone === "upcoming") {
    return (
      <span className="inline-flex items-center text-[10px] uppercase tracking-wide text-zinc-300 border border-zinc-700 rounded-full px-2 py-0.5">
        Open
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] uppercase tracking-wide text-zinc-500 border border-zinc-800 rounded-full px-2 py-0.5">
      Final
    </span>
  );
}

function SubtitleByTone({
  contest,
  tone,
  myResult,
}: {
  contest: Contest;
  tone: Tone;
  myResult?: ContestResultForUser;
}) {
  if (tone === "live") {
    return (
      <>
        {contest.entryCount}{" "}
        {contest.entryCount === 1 ? "entry" : "entries"} ·{" "}
        {formatTimeUntil(contest.resolvesAt)} left
      </>
    );
  }
  if (tone === "upcoming") {
    return (
      <>Opens Mon 09:15 IST · {formatTimeUntil(contest.opensAt)}</>
    );
  }
  // past
  if (myResult) {
    return (
      <>
        You finished {ordinal(myResult.rank)} ·{" "}
        <span
          className={
            myResult.ratingDelta > 0
              ? "text-emerald-400"
              : myResult.ratingDelta < 0
                ? "text-red-400"
                : "text-zinc-500"
          }
        >
          {formatRatingDelta(myResult.ratingDelta)}
        </span>
      </>
    );
  }
  return (
    <>
      {contest.entryCount}{" "}
      {contest.entryCount === 1 ? "entry" : "entries"} ·{" "}
      {formatTimeSince(contest.resolvesAt)}
    </>
  );
}

function RightSlot({
  contest,
  tone,
  myResult,
}: {
  contest: Contest;
  tone: Tone;
  myResult?: ContestResultForUser;
}) {
  if (tone === "upcoming") {
    return (
      <span className="text-xs text-zinc-300 border border-zinc-800 rounded-md px-3 py-1.5">
        Enter →
      </span>
    );
  }
  if (tone === "past" && myResult) {
    return (
      <span className="text-sm tabular-nums text-zinc-400">
        {formatReturnPct(myResult.finalReturn)}
      </span>
    );
  }
  return (
    <span className="text-xs tabular-nums text-zinc-600">
      {contest.entryCount}{" "}
      {contest.entryCount === 1 ? "entry" : "entries"}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
