"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/app/(app)/profile/[id]/actions";

export function ProfileNameEditor({
  initialName,
}: {
  initialName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-medium">{initialName}</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setValue(initialName);
            setError(null);
          }}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          edit
        </button>
      </div>
    );
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updateDisplayName(value);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  const trimmed = value.trim();
  const canSave =
    !isPending && trimmed.length >= 2 && trimmed !== initialName;

  return (
    <form onSubmit={save} className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={32}
          aria-label="Display name"
          className="text-2xl font-medium bg-zinc-900 border border-zinc-800 rounded px-2 py-1 min-w-0 flex-1 focus:outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={!canSave}
          className="text-xs bg-white text-black rounded px-3 py-1.5 disabled:opacity-30"
        >
          {isPending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
