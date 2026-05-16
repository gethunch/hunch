import {
  formatLabel,
  formatPeriod,
  formatDayMonth,
  formatReturnPct,
} from "@/lib/contest-display";
import type { Contest } from "@/lib/repository/contests";

interface StatCell {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

interface Props {
  contest: Contest;
  statusLabel: string;
  statusTone: "live" | "open" | "resolved";
  subtitle?: React.ReactNode;
  stats: StatCell[];
}

export function ContestDetailHeader({
  contest,
  statusLabel,
  statusTone,
  subtitle,
  stats,
}: Props) {
  return (
    <header className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
          <StatusBadge label={statusLabel} tone={statusTone} />
          <span>·</span>
          <span>{formatDayMonth(contest.periodStart)}</span>
        </div>
        <h1 className="text-2xl font-medium">
          {formatLabel(contest.format)} ·{" "}
          <span className="text-zinc-400">
            {formatPeriod(contest.periodStart)}
          </span>
        </h1>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-900 border border-zinc-900 rounded-lg overflow-hidden">
        {stats.map((s, i) => (
          <Cell key={i} {...s} />
        ))}
      </div>
    </header>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "live" | "open" | "resolved";
}) {
  if (tone === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {label}
      </span>
    );
  }
  if (tone === "open") {
    return <span className="text-zinc-300">{label}</span>;
  }
  return <span className="text-zinc-500">{label}</span>;
}

function Cell({ label, value, tone = "neutral" }: StatCell) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-red-400"
        : "text-zinc-100";
  return (
    <div className="bg-black p-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
        {label}
      </p>
      <p className={`text-lg font-medium tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export { type StatCell };
export function returnTone(r: number): StatCell["tone"] {
  if (r > 0) return "positive";
  if (r < 0) return "negative";
  return "neutral";
}

export function formatReturnCell(r: number): string {
  return formatReturnPct(r);
}
