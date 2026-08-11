"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { resendVerification, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { BackgroundCarousel } from "@/components/BackgroundCarousel";
import { usePageEntrance } from "@/lib/usePageEntrance";

type Status = "verifying" | "success" | "error";

function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { verifyEmail } = useAuth();

  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setError("This verification link is missing a token.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/explore"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof ApiError ? err.message : "Something went wrong. Please try again."
        );
      });
    // Only ever runs once per token — verifyEmail/router identity churn
    // shouldn't re-trigger a second verification attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsResending(true);
    setResendMessage(null);

    try {
      const result = await resendVerification(resendEmail);
      setResendMessage(result.message);
    } catch (err) {
      setResendMessage(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      data-animate
      className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl lg:mr-8 xl:mr-20"
    >
      {status === "verifying" && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-white">Verifying your email...</h2>
          <p className="text-sm text-white/80">Hang tight, this only takes a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-white">Email verified</h2>
          <p className="text-sm text-white/80">
            Your account is active. Taking you to your homepage...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-white">Verification failed</h2>
          <p className="text-sm text-red-300">{error}</p>

          <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Resend verification link
              </label>
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            {resendMessage && <p className="text-sm text-white/80">{resendMessage}</p>}

            <button
              type="submit"
              disabled={isResending}
              className="w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend link"}
            </button>
          </form>

          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-white underline"
          >
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
              Almost
              <br />
              There
            </h1>
          </div>
          <p
            data-animate
            className="font-edu mt-4 max-w-sm text-base text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:text-lg"
          >
            Confirming your email so you can start planning your next trip.
          </p>
        </div>

        <Suspense fallback={null}>
          <VerifyEmailCard />
        </Suspense>
      </div>
    </div>
  );
}
