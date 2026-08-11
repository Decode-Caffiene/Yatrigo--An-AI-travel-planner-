"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { takeTravelQuiz, ApiError } from "@/lib/api";
import type { QuizRecommendation } from "@/types";

interface Question {
  id: string;
  label: string;
  icon: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: "vibe",
    label: "What's your ideal trip vibe?",
    icon: "mood",
    options: ["Relaxation", "Adventure", "Culture & History", "Nature & Wildlife", "Nightlife & Food"],
  },
  {
    id: "budget",
    label: "What's your daily budget?",
    icon: "payments",
    options: ["Budget-friendly (<$50/day)", "Moderate ($50-150/day)", "Luxury ($150+/day)"],
  },
  {
    id: "companions",
    label: "Who are you traveling with?",
    icon: "group",
    options: ["Solo", "Partner", "Family", "Friends"],
  },
  {
    id: "climate",
    label: "What climate do you prefer?",
    icon: "thermostat",
    options: ["Tropical & warm", "Mild & temperate", "Cold & snowy", "No preference"],
  },
  {
    id: "duration",
    label: "How long is your trip?",
    icon: "date_range",
    options: ["Weekend getaway", "1-2 weeks", "3+ weeks"],
  },
];

const COVER_IMAGES = ["/01.jpg", "/02.jpg", "/03.jpg", "/04.jpg", "/05.jpg"];

function coverImageFor(name: string) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return COVER_IMAGES[hash % COVER_IMAGES.length];
}

export default function TravelQuizPage() {
  const { isReady } = useRequireAuth();
  const { token } = useAuth();
  const scope = usePageEntrance<HTMLDivElement>();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<QuizRecommendation[] | null>(
    null
  );
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  if (!isReady) return null;

  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    if (!token) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await takeTravelQuiz(token, finalAnswers);
      setRecommendations(result.recommendations);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not generate recommendations."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOption = (option: string) => {
    const question = QUESTIONS[step];
    const nextAnswers = { ...answers, [question.id]: option };
    setAnswers(nextAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      submitQuiz(nextAnswers);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setRecommendations(null);
    setError(null);
  };

  const question = QUESTIONS[step];

  return (
    <div ref={scope} className="mx-auto max-w-2xl">
      <Link
        href="/explore"
        data-animate
        className="mb-stack-md inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to explore
      </Link>

      <div
        data-animate
        className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6 md:p-stack-lg"
      >
        {isSubmitting && (
          <div className="py-stack-lg text-center">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
            <p className="mt-stack-sm font-body-md text-body-md text-on-surface-variant">
              Finding your perfect destinations...
            </p>
          </div>
        )}

        {error && !isSubmitting && (
          <div className="py-stack-md text-center">
            <p className="mb-stack-sm font-body-sm text-body-sm text-error">{error}</p>
            <button
              type="button"
              onClick={() => submitQuiz(answers)}
              className="font-button text-button text-primary underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isSubmitting && !error && !recommendations && (
          <>
            <div className="mb-stack-lg flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container/20">
                <span className="material-symbols-outlined text-3xl text-primary">
                  quiz
                </span>
              </div>
              <div>
                <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
                  Travel Quiz
                </h1>
                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Question {step + 1} of {QUESTIONS.length}
                </p>
              </div>
            </div>

            <div className="mb-stack-lg h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <span className="material-symbols-outlined text-primary">
                {question.icon}
              </span>
              {question.label}
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className="rounded-lg border border-surface-variant px-4 py-3 text-left font-body-md text-body-md text-on-surface transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {option}
                </button>
              ))}
            </div>

            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="mt-stack-lg font-body-sm text-body-sm text-on-surface-variant hover:text-primary"
              >
                &larr; Back
              </button>
            )}
          </>
        )}

        {recommendations && !isSubmitting && (
          <>
            <div className="mb-stack-lg flex items-center justify-between gap-4">
              <div>
                <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
                  Your matches
                </h1>
                <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                  Based on your answers, here&apos;s where you should go.
                </p>
              </div>
              <button
                type="button"
                onClick={restart}
                className="flex shrink-0 items-center gap-1 font-button text-button text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Retake
              </button>
            </div>

            <div className="space-y-stack-md">
              {recommendations.map((rec) => (
                <div
                  key={rec.destination}
                  className="flex flex-col overflow-hidden rounded-xl border border-surface-variant sm:flex-row"
                >
                  <div className="relative h-40 w-full sm:h-auto sm:w-2/5">
                    <Image
                      src={
                        rec.imageUrl && !failedImages.has(rec.destination)
                          ? rec.imageUrl
                          : coverImageFor(rec.destination)
                      }
                      alt={rec.destination}
                      fill
                      onError={() =>
                        setFailedImages((current) => new Set(current).add(rec.destination))
                      }
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-stack-md">
                    <div>
                      <h3 className="mb-1 font-headline-md text-headline-md text-on-surface">
                        {rec.destination}
                      </h3>
                      <p className="mb-stack-sm font-body-sm text-body-sm text-on-surface-variant">
                        {rec.reason}
                      </p>
                      {rec.matchTags.length > 0 && (
                        <div className="mb-stack-sm flex flex-wrap gap-2">
                          {rec.matchTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-label-caps text-label-caps text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/destinations/${encodeURIComponent(rec.destination)}`}
                        className="flex-1 rounded-lg border border-primary px-3 py-2 text-center font-button text-button text-primary transition-colors hover:bg-primary/5"
                      >
                        View Guide
                      </Link>
                      <Link
                        href={`/trips/new?destination=${encodeURIComponent(rec.destination)}`}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-center font-button text-button text-on-primary transition-colors hover:bg-primary/90"
                      >
                        Plan a Trip
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
