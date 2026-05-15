"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AVATAR_PRESETS, DEFAULT_AVATAR } from "@/lib/avatars";
import { EMAIL_REGEX, USERNAME_REGEX } from "@/lib/identity";
import { completeOnboarding } from "@/app/(app)/onboarding/actions";

type UsernameStatusKind =
  | "idle"
  | "checking"
  | "valid"
  | "taken"
  | "invalid";

export function OnboardingForm({ userId }: { userId: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  // The server result is only meaningful for the last-fetched username. Track
  // which input the result corresponds to so we can tell apart "still checking
  // the current input" vs. "we have a result for this exact input".
  const [serverResult, setServerResult] = useState<{
    username: string;
    available: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validShape = username !== "" && USERNAME_REGEX.test(username);

  // Derive display status synchronously from username + last server result.
  const usernameStatus: UsernameStatusKind = (() => {
    if (username === "") return "idle";
    if (!validShape) return "invalid";
    if (serverResult?.username === username) {
      return serverResult.available ? "valid" : "taken";
    }
    return "checking";
  })();

  // Debounced live availability fetch. setState only happens inside the async
  // callback, not in the effect body — keeps the react-hooks lint rule happy.
  useEffect(() => {
    if (!validShape) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/username-available?u=${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          valid: boolean;
          available: boolean;
        };
        if (controller.signal.aborted) return;
        setServerResult({
          username,
          available: data.valid && data.available,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, validShape]);

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
      // Cache-bust on each upload so the new image shows immediately.
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
    } finally {
      setUploading(false);
    }
  }

  const canSubmit =
    !isPending &&
    !uploading &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    EMAIL_REGEX.test(email) &&
    usernameStatus === "valid" &&
    avatarUrl.length > 0;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const formData = new FormData(e.currentTarget);
    // The avatar URL lives in state, not in a real field — push it manually.
    formData.set("avatarUrl", avatarUrl);

    setSubmitError(null);
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result && "error" in result) {
        setSubmitError(result.error);
      }
      // On success the server action redirects; nothing to do here.
    });
  }

  const usernameHint = (() => {
    switch (usernameStatus) {
      case "checking":
        return (
          <span className="text-xs text-zinc-500">checking…</span>
        );
      case "valid":
        return (
          <span className="text-xs text-emerald-400">available</span>
        );
      case "taken":
        return <span className="text-xs text-red-400">taken</span>;
      case "invalid":
        return (
          <span className="text-xs text-red-400">
            3–20 chars, letters/numbers/underscore
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Avatar
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-800 shrink-0">
            <Image
              src={avatarUrl}
              alt="Selected avatar"
              width={64}
              height={64}
              unoptimized
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[DEFAULT_AVATAR, ...AVATAR_PRESETS].map((p) => {
              const selected = avatarUrl === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setAvatarUrl(p)}
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
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            First name
          </span>
          <input
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={40}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
          />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Last name
          </span>
          <input
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={40}
            required
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
          />
        </label>
      </section>

      <label className="space-y-1.5 block">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Email
        </span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
        />
        <span className="text-xs text-zinc-600">
          We send a confirmation link — you can keep playing while it&apos;s
          pending.
        </span>
      </label>

      <label className="space-y-1.5 block">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Username
          </span>
          {usernameHint}
        </div>
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          autoComplete="off"
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm font-mono focus:border-zinc-600 focus:outline-none"
        />
        <span className="text-xs text-zinc-600">
          Permanent — pick carefully.
        </span>
      </label>

      {submitError && (
        <p className="text-sm text-red-400">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-emerald-600 text-white font-medium rounded py-2.5 text-sm hover:bg-emerald-500 transition-colors disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
