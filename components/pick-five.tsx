"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitContestEntry,
  updateContestEntry,
  type SubmitResult,
} from "@/app/(app)/contests/[slug]/actions";
import { PICKS_PER_ENTRY, type Nifty50Stock } from "@/lib/constants";

interface Props {
  stocks: readonly Nifty50Stock[];
  slug: string;
  mode: "create" | "edit";
  initialSymbols?: readonly string[];
  onCancel?: () => void;
}

export function PickFive({
  stocks,
  slug,
  mode,
  initialSymbols = [],
  onCancel,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSymbols),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(symbol: string) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
        return next;
      }
      if (next.size >= PICKS_PER_ENTRY) {
        setError(
          `Pick limit is ${PICKS_PER_ENTRY}. Deselect one before picking another.`,
        );
        return prev;
      }
      next.add(symbol);
      return next;
    });
  }

  function submit() {
    setError(null);
    const action =
      mode === "create" ? submitContestEntry : updateContestEntry;
    startTransition(async () => {
      const result: SubmitResult = await action(slug, Array.from(selected));
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const remaining = PICKS_PER_ENTRY - selected.size;
  const canSubmit = selected.size === PICKS_PER_ENTRY && !isPending;
  const ctaLabel =
    mode === "edit"
      ? isPending
        ? "…"
        : "Save picks"
      : isPending
        ? "…"
        : "Lock in";

  return (
    <div className="space-y-6 pb-28">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stocks.map((s) => {
          const isSelected = selected.has(s.symbol);
          return (
            <button
              key={s.symbol}
              type="button"
              onClick={() => toggle(s.symbol)}
              className={
                isSelected
                  ? "text-left px-3 py-2 rounded-md border border-white/60 bg-white/5"
                  : "text-left px-3 py-2 rounded-md border border-zinc-900 hover:border-zinc-700"
              }
            >
              <div className="text-sm font-medium">{s.symbol}</div>
              <div className="text-xs text-zinc-500 truncate">{s.name}</div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 max-w-3xl mx-auto sm:mx-0 sm:w-auto bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-md p-4 flex items-center justify-between gap-4">
        <div className="text-sm tabular-nums">
          {selected.size === 0 ? (
            <span className="text-zinc-500">
              Pick {PICKS_PER_ENTRY} stocks
            </span>
          ) : remaining > 0 ? (
            <span className="text-zinc-300">
              {selected.size} / {PICKS_PER_ENTRY} — {remaining} more
            </span>
          ) : (
            <span className="text-zinc-300">
              {selected.size} / {PICKS_PER_ENTRY} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="bg-white text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-30"
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
