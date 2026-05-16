"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarPicker } from "@/components/avatar-picker";
import {
  updateAvatar,
  updateEmail,
  updateName,
  resendEmailVerification,
} from "@/app/(app)/profile/[username]/actions";

type EditorUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
};

export function ProfileEditor({ user }: { user: EditorUser }) {
  return (
    <div className="space-y-8 border border-zinc-900 rounded-lg p-6">
      <AvatarSection userId={user.id} initialUrl={user.avatarUrl} />
      <NameSection
        initialFirst={user.firstName ?? ""}
        initialLast={user.lastName ?? ""}
      />
      <EmailSection
        initialEmail={user.email ?? ""}
        verified={user.emailVerifiedAt !== null}
      />
    </div>
  );
}

function AvatarSection({
  userId,
  initialUrl,
}: {
  userId: string;
  initialUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(newUrl: string) {
    setAvatarUrl(newUrl);
    setError(null);
    startTransition(async () => {
      const result = await updateAvatar(newUrl);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Avatar
        </p>
        {isPending && <span className="text-xs text-zinc-600">saving…</span>}
      </div>
      <AvatarPicker userId={userId} value={avatarUrl} onChange={handleChange} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  );
}

function NameSection({
  initialFirst,
  initialLast,
}: {
  initialFirst: string;
  initialLast: string;
}) {
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);
  const [savedFirst, setSavedFirst] = useState(initialFirst);
  const [savedLast, setSavedLast] = useState(initialLast);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateName(first, last);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedFirst(first.trim());
      setSavedLast(last.trim());
      setEditing(false);
      router.refresh();
    });
  }

  function onCancel() {
    setFirst(savedFirst);
    setLast(savedLast);
    setError(null);
    setEditing(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Name
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 hover:text-zinc-200"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="First name"
              maxLength={40}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
            />
            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Last name"
              maxLength={40}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-black font-medium transition-colors"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="text-xs px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-zinc-400"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <p className="text-sm">
          {savedFirst} {savedLast}
        </p>
      )}
    </section>
  );
}

function EmailSection({
  initialEmail,
  verified,
}: {
  initialEmail: string;
  verified: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [savedVerified, setSavedVerified] = useState(verified);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const router = useRouter();

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateEmail(email);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const trimmed = email.trim();
      const changed = trimmed.toLowerCase() !== savedEmail.toLowerCase();
      setSavedEmail(trimmed);
      if (changed) setSavedVerified(false);
      setEditing(false);
      router.refresh();
    });
  }

  function onCancel() {
    setEmail(savedEmail);
    setError(null);
    setEditing(false);
  }

  function onResend() {
    setResendStatus(null);
    startResend(async () => {
      const result = await resendEmailVerification();
      setResendStatus(
        "error" in result ? result.error : "Verification email sent.",
      );
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Email
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 hover:text-zinc-200"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-zinc-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-black font-medium transition-colors"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="text-xs px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded text-zinc-400"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <p className="text-sm">{savedEmail || "—"}</p>
            {savedEmail && (
              <span
                className={
                  "text-xs " +
                  (savedVerified ? "text-emerald-400" : "text-amber-400")
                }
              >
                {savedVerified ? "Verified" : "Pending verification"}
              </span>
            )}
          </div>
          {savedEmail && !savedVerified && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onResend}
                disabled={isResending}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline disabled:opacity-50"
              >
                {isResending ? "Sending…" : "Resend verification email"}
              </button>
              {resendStatus && (
                <span className="text-xs text-zinc-500">{resendStatus}</span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
