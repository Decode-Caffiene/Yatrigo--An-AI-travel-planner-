"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { ApiError, resendVerification } from "@/lib/api";
import { BackgroundCarousel } from "@/components/BackgroundCarousel";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { LoginSuccessTransition } from "@/components/LoginSuccessTransition";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { isValidGmailAddress, GMAIL_ERROR_MESSAGE } from "@/lib/validators";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const scope = usePageEntrance<HTMLDivElement>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendMessage(null);

    if (!isValidGmailAddress(email)) {
      setError(GMAIL_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      setIsTransitioning(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setNeedsVerification(err.status === 403);
      } else {
        setError("Login failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);

    try {
      const result = await resendVerification(email);
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
              Beyond
              <br />
              Borders
            </h1>
          </div>
          <p
            data-animate
            className="font-edu mt-4 max-w-sm text-base text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:text-lg"
          >
            Unlock the world. Let your wanderlust lead you to your dream
            destinations.
          </p>
        </div>

        {/* Login card */}
        <div
          data-animate
          className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl lg:mr-8 xl:mr-20"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Email
              </label>
              <input
                type="email"
                required
                pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                title="Please enter a valid Gmail address (e.g. name@gmail.com)"
                placeholder="Enter your Gmail address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-white/70 underline hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            {needsVerification && (
              <div className="space-y-2 rounded-lg bg-white/10 p-3">
                {resendMessage ? (
                  <p className="text-sm text-white/80">{resendMessage}</p>
                ) : (
                  <>
                    <p className="text-xs text-white/70">
                      Didn&apos;t get the link, or has it expired?
                    </p>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-sm font-semibold text-white underline disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Resend verification email"}
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-white/25" />
              <span className="text-xs text-white/60">Or</span>
              <div className="h-px flex-1 bg-white/25" />
            </div>

            <GoogleSignInButton
              onSuccess={() => setIsTransitioning(true)}
              onError={(message) => setError(message)}
            />

            <p className="pt-1 text-center text-sm text-white/80">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-white underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {isTransitioning && (
        <LoginSuccessTransition onComplete={() => router.push("/explore")} />
      )}
    </div>
  );
}
