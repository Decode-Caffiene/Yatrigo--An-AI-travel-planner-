"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { resetPassword, ApiError } from "@/lib/api";
import { BackgroundCarousel } from "@/components/BackgroundCarousel";
import { usePageEntrance } from "@/lib/usePageEntrance";

function ResetPasswordCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-animate
      className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl lg:mr-8 xl:mr-20"
    >
      {success ? (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-white">Password reset</h2>
          <p className="text-sm text-white/80">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-300"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="mb-1 text-xl font-semibold text-white">
            Set a new password
          </h2>

          {!token && (
            <p className="text-sm text-red-300">
              This link is missing a reset token. Request a new one from the{" "}
              <Link href="/forgot-password" className="underline">
                forgot password
              </Link>{" "}
              page.
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              New password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-300 disabled:opacity-50"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const scope = usePageEntrance<HTMLDivElement>();

  return (
    <div ref={scope} className="relative min-h-screen w-full overflow-hidden">
      <BackgroundCarousel />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent" />

      <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-6 py-10 sm:px-12 lg:flex-row lg:items-center lg:justify-between lg:py-0">
        {/* Hero copy */}
        <div className="mt-auto max-w-md pb-12 lg:mt-0 lg:pb-0">
          <div data-animate className="flex items-center gap-4">
            <Image
              src="/yatrigo-logo.png"
              alt="Yatrigo"
              width={468}
              height={596}
              className="h-24 w-auto shrink-0 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] sm:h-28"
              priority
            />
            <h1 className="font-edu text-5xl font-bold uppercase leading-[1.05] tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.7)] sm:text-6xl">
              New
              <br />
              Password
            </h1>
          </div>
          <p
            data-animate
            className="font-edu mt-4 max-w-sm text-base text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:text-lg"
          >
            Almost there. Choose a strong new password for your account.
          </p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordCard />
        </Suspense>
      </div>
    </div>
  );
}
