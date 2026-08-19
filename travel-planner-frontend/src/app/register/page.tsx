"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { BackgroundCarousel } from "@/components/BackgroundCarousel";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { usePageEntrance } from "@/lib/usePageEntrance";
import {
  isValidGmailAddress,
  isValidPassword,
  GMAIL_ERROR_MESSAGE,
  PASSWORD_ERROR_MESSAGE,
} from "@/lib/validators";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scope = usePageEntrance<HTMLDivElement>([submitted]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isValidGmailAddress(email)) {
      setError(GMAIL_ERROR_MESSAGE);
      return;
    }

    if (!isValidPassword(password)) {
      setError(PASSWORD_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      await register(name, email, password);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
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
              Start Your
              <br />
              Journey
            </h1>
          </div>
          <p
            data-animate
            className="font-edu mt-4 max-w-sm text-base text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:text-lg"
          >
            Create an account to plan trips, save itineraries, and explore
            destinations tailored to you.
          </p>
        </div>

        {/* Register card */}
        <div
          data-animate
          className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl lg:mr-8 xl:mr-20"
        >
          {submitted ? (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-semibold text-white">Check your email</h2>
              <p className="text-sm text-white/80">
                We&apos;ve sent a verification link to{" "}
                <span className="font-medium text-white">{email}</span>. Click
                it to activate your account and sign in. The link expires in
                24 hours.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-white underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-5 text-xl font-semibold text-white">
                Create an account
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </div>

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
                  <p className="mt-1 text-xs text-white/60">
                    Only Gmail addresses (e.g. name@gmail.com) are accepted.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-white">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                    title="At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <p className="mt-1 text-xs text-white/60">
                    Must include an uppercase letter, a lowercase letter, a number, and a special character.
                  </p>
                  <PasswordStrengthMeter password={password} />
                </div>

                {error && <p className="text-sm text-red-300">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-300 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-white/25" />
                  <span className="text-xs text-white/60">Or</span>
                  <div className="h-px flex-1 bg-white/25" />
                </div>

                <GoogleSignInButton
                  onSuccess={() => router.push("/explore")}
                  onError={(message) => setError(message)}
                />

                <p className="pt-1 text-center text-sm text-white/80">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-white underline">
                    Log in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
