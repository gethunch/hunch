"use client";

import { useState } from "react";
import { PickFive } from "@/components/pick-five";
import { NIFTY_50, type Nifty50Stock } from "@/lib/constants";

interface Props {
  slug: string;
  existingPicks: string[] | null;
  canEdit: boolean;
  stocks?: readonly Nifty50Stock[];
}

export function EntryView({
  slug,
  existingPicks,
  canEdit,
  stocks = NIFTY_50,
}: Props) {
  const hasEntry = existingPicks !== null;
  const [editing, setEditing] = useState(!hasEntry);

  // Edit mode (also the initial state when no entry exists yet).
  if (editing) {
    return (
      <PickFive
        stocks={stocks}
        slug={slug}
        mode={hasEntry ? "edit" : "create"}
        initialSymbols={existingPicks ?? []}
        onCancel={hasEntry ? () => setEditing(false) : undefined}
      />
    );
  }

  // Display mode — picks locked in, optionally editable until lock time.
  return (
    <section className="border border-zinc-900 rounded-lg p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-emerald-400">
          Locked in for this week
        </h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1 transition-colors"
          >
            Edit picks
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {existingPicks!.map((symbol) => {
          const stock = stocks.find((s) => s.symbol === symbol);
          return (
            <li key={symbol} className="flex items-baseline gap-3">
              <span className="text-sm font-medium tabular-nums">
                {symbol}
              </span>
              {stock && (
                <span className="text-xs text-zinc-500">{stock.name}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-zinc-600 pt-2">
        Entry prices are captured at market open. Resolution at Friday close.
      </p>
    </section>
  );
}
