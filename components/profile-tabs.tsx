"use client";

import { useState } from "react";
import { RatingChart, type RatingPoint } from "@/components/rating-chart";
import { ProfileEditor } from "@/components/profile-editor";

type Entry = {
  entryId: string;
  contestPeriodStart: string;
  finalReturn: number | null;
  finalRank: number | null;
  ratingDelta: number | null;
  picks: string[];
};

type EditorUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
};

type Tab = "history" | "entries" | "settings";

export function ProfileTabs({
  isMe,
  chartData,
  hasContests,
  entries,
  editorUser,
}: {
  isMe: boolean;
  chartData: RatingPoint[];
  hasContests: boolean;
  entries: Entry[];
  editorUser: EditorUser | null;
}) {
  const [tab, setTab] = useState<Tab>("history");

  const tabs: { id: Tab; label: string }[] = [
    { id: "history", label: "History" },
    { id: "entries", label: "Entries" },
  ];
  if (isMe) tabs.push({ id: "settings", label: "Edit profile" });

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-900">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "pb-3 -mb-px text-sm transition-colors " +
                (tab === t.id
                  ? "text-zinc-100 border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "history" && (
        <section>
          {hasContests ? (
            <div className="border border-zinc-900 rounded-lg p-4">
              <RatingChart data={chartData} />
            </div>
          ) : (
            <div className="border border-zinc-900 rounded-lg p-8 text-center">
              <p className="text-zinc-500 text-sm">
                No contests yet. The rating chart appears after the first
                contest resolves.
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "entries" && (
        <section>
          {entries.length === 0 ? (
            <p className="text-zinc-500 text-sm">No entries yet.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li
                  key={e.entryId}
                  className="border border-zinc-900 rounded-md p-4"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-sm font-medium">
                      Week of {e.contestPeriodStart}
                    </span>
                    {e.finalRank != null ? (
                      <span className="text-xs tabular-nums text-zinc-500">
                        Rank {e.finalRank}
                        {e.ratingDelta != null && (
                          <span
                            className={
                              (e.ratingDelta >= 0
                                ? "text-emerald-400"
                                : "text-red-400") + " ml-2"
                            }
                          >
                            {e.ratingDelta >= 0 ? "+" : ""}
                            {e.ratingDelta}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">In progress</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {e.picks.map((s) => (
                      <span
                        key={s}
                        className="text-xs tabular-nums px-2 py-0.5 bg-zinc-900 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  {e.finalReturn != null && (
                    <p className="text-xs tabular-nums text-zinc-500 mt-3">
                      Return:{" "}
                      <span
                        className={
                          e.finalReturn >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {e.finalReturn >= 0 ? "+" : ""}
                        {(e.finalReturn * 100).toFixed(2)}%
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "settings" && isMe && editorUser && (
        <ProfileEditor user={editorUser} />
      )}
    </div>
  );
}
