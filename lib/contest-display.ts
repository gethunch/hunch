// Display helpers for contests. Kept tiny and pure so they can be imported
// from both server and client components without dragging the DB in.

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatLabel(format: string): string {
  if (format === "weekly_pick_5") return "Weekly Pick 5";
  return format;
}

// "2026-05-18" → "18 May '26"
export function formatPeriod(periodStart: string): string {
  const [y, m, d] = periodStart.split("-").map((s) => parseInt(s, 10));
  return `${d} ${MONTHS_SHORT[m - 1]} '${String(y).slice(2)}`;
}

// "2026-05-18" → "Mon, 18 May" (resolve date / friday display)
export function formatDayMonth(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  const weekday = d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  });
  const [, m, day] = isoDate.split("-").map((s) => parseInt(s, 10));
  return `${weekday}, ${day} ${MONTHS_SHORT[m - 1]}`;
}

// Time-remaining in coarse units ("3d 12h", "2h 14m", "32m"). Server-rendered
// once per page load; we don't tick on index views.
export function formatTimeUntil(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const totalMin = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Time-since for resolved contests ("2d ago", "3w ago"). Coarse-grained.
export function formatTimeSince(past: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - past.getTime();
  if (diffMs <= 0) return "just now";
  const totalMin = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMin / 1440);
  if (days >= 14) return `${Math.floor(days / 7)}w ago`;
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(totalMin / 60);
  if (hours >= 1) return `${hours}h ago`;
  return `${totalMin}m ago`;
}

// "0.0287" → "+2.9%", "-0.0142" → "-1.4%". Always one decimal place.
export function formatReturnPct(r: number): string {
  const pct = r * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// "+18" / "−12" with a non-breaking minus for the en-dash look. Negative
// values get the unicode minus so they line up with positives.
export function formatRatingDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}
