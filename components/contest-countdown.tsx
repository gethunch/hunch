"use client";

import { useSyncExternalStore } from "react";

// Shared ticking clock — one setInterval across all ContestCountdown instances
// on the page. useSyncExternalStore is the React-19-idiomatic pattern for
// subscribing to external time, and it returns getServerSnapshot()'s null
// during SSR so there's no Date.now()-mismatch hydration error.

let cachedNow: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (intervalId === null) {
    cachedNow = Date.now();
    intervalId = setInterval(() => {
      cachedNow = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  // Notify *this* subscriber so it picks up the freshly-set cachedNow
  // (the initial render returned null via getSnapshot before subscribe ran).
  callback();
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      cachedNow = null;
    }
  };
}

function getSnapshot(): number | null {
  return cachedNow;
}

function getServerSnapshot(): number | null {
  return null;
}

export function ContestCountdown({ locksAtISO }: { locksAtISO: string }) {
  const lockTime = new Date(locksAtISO).getTime();
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (now === null) {
    return (
      <p className="text-sm text-zinc-400">
        Picks lock in <span className="text-zinc-100 tabular-nums">—</span>
      </p>
    );
  }

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
