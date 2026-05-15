"use client";

import { useEffect, useState } from "react";

export function ContestCountdown({ locksAtISO }: { locksAtISO: string }) {
  const lockTime = new Date(locksAtISO).getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diffMs = lockTime - now;

  if (diffMs <= 0) {
    return (
      <p className="text-sm text-zinc-500">
        Submissions closed for this week.
      </p>
    );
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <p className="text-sm text-zinc-400">
      Picks lock in{" "}
      <span className="text-zinc-100 tabular-nums">
        {days > 0 && <>{days}d </>}
        {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
      </span>
    </p>
  );
}
