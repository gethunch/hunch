"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp } from "@/app/login/actions";
import { safeNextPath } from "@/lib/safe-next";

type Step = "phone" | "otp";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"), "/contest");

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendOtp(phone.trim());
      if ("error" in result) {
        setError(result.error);
      } else {
        setStep("otp");
      }
    });
  }

  function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(phone.trim(), otp.trim());
      if ("error" in result) {
        setError(result.error);
      } else {
        router.replace(nextPath);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={step === "phone" ? submitPhone : submitOtp}
      className="space-y-4"
    >
      {step === "phone" ? (
        <label className="block space-y-2">
          <span className="text-sm text-zinc-400">Phone number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919999900001"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-base focus:outline-none focus:border-zinc-600"
          />
        </label>
      ) : (
        <>
          <label className="block space-y-2">
            <span className="text-sm text-zinc-400">
              Code sent to {phone}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-base tabular-nums tracking-widest focus:outline-none focus:border-zinc-600"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError(null);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Use a different number
          </button>
        </>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-white text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 rounded-md px-3 py-2 font-medium disabled:opacity-50"
      >
        {isPending
          ? "…"
          : step === "phone"
            ? "Send code"
            : "Verify and sign in"}
      </button>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
