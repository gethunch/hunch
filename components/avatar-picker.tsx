"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AVATAR_PRESETS, DEFAULT_AVATAR } from "@/lib/avatars";

export function AvatarPicker({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string;
  onChange: (newUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onChange(`${data.publicUrl}?v=${Date.now()}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-800 shrink-0">
          <Image
            src={value}
            alt="Selected avatar"
            width={64}
            height={64}
            unoptimized
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[DEFAULT_AVATAR, ...AVATAR_PRESETS].map((p) => {
            const selected = value === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => onChange(p)}
                className={
                  "w-10 h-10 rounded-full overflow-hidden border transition-colors " +
                  (selected
                    ? "border-emerald-500"
                    : "border-zinc-800 hover:border-zinc-600")
                }
                aria-label={`Pick avatar ${p}`}
              >
                <Image src={p} alt="" width={40} height={40} unoptimized />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 h-10 rounded-full border border-zinc-800 hover:border-zinc-600 text-zinc-300 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
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
        </div>
      </div>
      {uploadError && (
        <p className="text-xs text-red-400">{uploadError}</p>
      )}
    </div>
  );
}
