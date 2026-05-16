"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AVATAR_PRESETS } from "@/lib/avatars";

export function AvatarPicker({
  userId,
  value,
  onChange,
  size = 80,
  triggerLabel = "Change",
  emptyLabel = "Pick avatar",
}: {
  userId: string;
  value: string | null;
  onChange: (newUrl: string) => void;
  size?: number;
  triggerLabel?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "rounded-full overflow-hidden border transition-colors shrink-0 " +
          (value
            ? "border-zinc-800 hover:border-zinc-600"
            : "border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-xs text-zinc-500 bg-zinc-950")
        }
        style={{ width: size, height: size }}
        aria-label={value ? "Change avatar" : "Pick an avatar"}
      >
        {value ? (
          <Image src={value} alt="" width={size} height={size} unoptimized />
        ) : (
          <span>{emptyLabel}</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-400 hover:text-zinc-200 underline"
      >
        {value ? triggerLabel : emptyLabel}
      </button>
      {open && (
        <AvatarModal
          userId={userId}
          currentValue={value}
          onPick={(newUrl) => {
            onChange(newUrl);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AvatarModal({
  userId,
  currentValue,
  onPick,
  onClose,
}: {
  userId: string;
  currentValue: string | null;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESC closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("PNG, JPEG, or WEBP only");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Max 2 MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        setUploadError(error.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onPick(`${data.publicUrl}?v=${Date.now()}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">Pick an avatar</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {AVATAR_PRESETS.map((p) => {
            const selected = currentValue === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => onPick(p)}
                className={
                  "aspect-square rounded-full overflow-hidden border-2 transition-colors " +
                  (selected
                    ? "border-emerald-500"
                    : "border-transparent hover:border-zinc-600")
                }
                aria-label={`Pick avatar ${p}`}
              >
                <Image
                  src={p}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="w-full h-full"
                />
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-zinc-900 space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full text-sm px-4 py-2 rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-200 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload your own"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
          <p className="text-xs text-zinc-600 text-center">
            PNG / JPEG / WEBP, max 2 MB.
          </p>
        </div>
      </div>
    </div>
  );
}
