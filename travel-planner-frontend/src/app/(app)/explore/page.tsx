"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { listTrips, getAISuggestions, ApiError } from "@/lib/api";
import { DestinationImage } from "@/components/DestinationImage";
import type { AISuggestion, Trip, TripStatus } from "@/types";

const STATUS_META: Record<TripStatus, { label: string; icon: string }> = {
  planning: { label: "Planning...", icon: "schedule" },
  completed: { label: "Completed", icon: "check_circle" },
  cancelled: { label: "Cancelled", icon: "cancel" },
};

const COVER_IMAGES = ["/01.jpg", "/02.jpg", "/03.jpg", "/04.jpg", "/05.jpg"];

function coverImageFor(name: string) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return COVER_IMAGES[hash % COVER_IMAGES.length];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function ExplorePage() {
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [failedSuggestionImages, setFailedSuggestionImages] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!isReady || !token) return;

    listTrips(token)
      .then((res) => setTrips(res.trips))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load trips.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token]);

  useEffect(() => {
    if (!isReady || !token) return;

    getAISuggestions(token)
      .then((res) => setSuggestions(res.suggestions))
      .catch((err) =>
        setSuggestionsError(
          err instanceof ApiError ? err.message : "Failed to load suggestions."
        )
      )
      .finally(() => setIsLoadingSuggestions(false));
  }, [isReady, token]);

  const upcomingTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ),
    [trips]
  );

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const firstName = user?.name.split(" ")[0] ?? "there";

  const scope = usePageEntrance<HTMLDivElement>([isLoading]);

  if (!isReady) return null;

  return (
    <div ref={scope} className="grid grid-cols-4 gap-gutter md:grid-cols-12 md:gap-stack-lg">
      {/* Hero / Greeting */}
      <section className="col-span-4 mb-stack-lg flex flex-col items-start justify-between gap-stack-md md:col-span-12 md:flex-row md:items-center">
        <div data-animate>
          <h1 className="mb-stack-sm font-headline-xl text-headline-lg-mobile text-on-surface md:text-headline-xl">
            {greeting}, {firstName}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Where is your next adventure taking you?
          </p>
        </div>
        <Link
          href="/trips/new"
          data-animate
          className="group ai-shadow flex items-center gap-2 rounded-full border-b-2 border-on-primary-fixed-variant bg-primary px-6 py-3 font-button text-button text-on-primary transition-colors hover:bg-on-primary-fixed active:translate-y-0.5 active:border-b-0"
        >
          <span className="material-symbols-outlined transition-transform group-hover:rotate-12">
            add_circle
          </span>
          Create New Trip
        </Link>
      </section>

      {/* Upcoming Trips */}
      <section className="col-span-4 md:col-span-8">
        <div className="mb-stack-md flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Upcoming Trips
          </h2>
          <Link
            href="/trips"
            className="font-button text-button text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        {isLoading && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Loading trips...
          </p>
        )}
        {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

        {!isLoading && !error && upcomingTrips.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-variant bg-surface-container-lowest p-stack-lg text-center">
            <p className="mb-stack-sm font-body-md text-body-md text-on-surface-variant">
              No trips yet.
            </p>
            <Link
              href="/trips/new"
              className="font-button text-button text-primary underline"
            >
              Create your first one
            </Link>
          </div>
        )}

        <div className="space-y-stack-md">
          {upcomingTrips.slice(0, 2).map((trip) => {
            const status = STATUS_META[trip.status];
            const blurb =
              trip.interests.length > 0
                ? `A trip focused on ${trip.interests.slice(0, 3).join(", ")}.`
                : "Your upcoming adventure awaits.";

            return (
              <div
                key={trip._id}
                data-animate
                className="ai-shadow flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest transition-transform duration-300 hover:-translate-y-1 md:flex-row"
              >
                <div className="relative h-48 w-full md:h-auto md:w-2/5">
                  <DestinationImage
                    destination={trip.destination}
                    alt={trip.destination}
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-surface-container-lowest/90 px-3 py-1 font-label-caps text-label-caps text-primary shadow-sm backdrop-blur-md">
                      <span className="material-symbols-outlined text-sm">
                        {status.icon}
                      </span>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="flex w-full flex-col justify-between p-stack-md md:w-3/5 md:p-stack-lg">
                  <div>
                    <div className="mb-stack-sm flex items-start justify-between">
                      <h3 className="font-headline-lg text-headline-lg leading-tight text-on-surface">
                        {trip.destination}
                      </h3>
                      <div className="rounded-md bg-surface-container px-2 py-1 font-label-caps text-label-caps text-on-surface-variant">
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </div>
                    </div>
                    <p className="mb-stack-md font-body-md text-body-md text-on-surface-variant">
                      {blurb}
                    </p>
                    {trip.interests.length > 0 && (
                      <div className="mb-stack-lg flex flex-wrap gap-2">
                        {trip.interests.slice(0, 3).map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-label-caps text-label-caps text-primary"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-between gap-stack-md border-t border-surface-variant pt-stack-md xl:flex-row">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                        Est. Budget
                      </span>
                      <span className="font-headline-md text-headline-md text-primary">
                        ${trip.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex w-full gap-2 xl:w-auto">
                      <Link
                        href={`/trips/${trip._id}?tab=details`}
                        className="flex-1 rounded-lg border border-primary px-4 py-2 text-center font-button text-button text-primary transition-colors hover:bg-primary/5 xl:flex-none"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/trips/${trip._id}?tab=itinerary`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary shadow-sm transition-colors hover:bg-on-primary-fixed xl:flex-none"
                      >
                        <span className="material-symbols-outlined text-lg">
                          auto_awesome
                        </span>
                        {trip.itinerary ? "View Itinerary" : "AI Itinerary"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Travel quiz */}
      <section className="col-span-4 md:col-span-4">
        <div
          data-animate
          className="flex h-full flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-stack-lg text-center"
        >
          <div className="mb-stack-md flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/20">
            <span className="material-symbols-outlined text-3xl text-primary">
              quiz
            </span>
          </div>
          <h2 className="mb-stack-sm font-headline-md text-headline-md text-on-surface">
            Not sure where to go?
          </h2>
          <p className="mb-stack-lg font-body-sm text-body-sm text-on-surface-variant">
            Answer a few quick questions and we&apos;ll match you with real
            destinations.
          </p>
          <Link
            href="/quiz"
            className="w-full rounded-lg bg-primary py-2.5 font-button text-button text-on-primary transition-colors hover:bg-primary/90"
          >
            Take the Travel Quiz
          </Link>
        </div>
      </section>

      {/* Suggestions */}
      <section className="col-span-4 mt-stack-md md:col-span-12">
        <div className="mb-stack-md flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Suggestions for You
          </h2>
        </div>

        {isLoadingSuggestions && (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 md:gap-stack-md lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl bg-surface-container md:h-80"
              />
            ))}
          </div>
        )}

        {suggestionsError && !isLoadingSuggestions && (
          <p className="font-body-sm text-body-sm text-error">{suggestionsError}</p>
        )}

        {!isLoadingSuggestions && !suggestionsError && (
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 md:gap-stack-md lg:grid-cols-3">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.destination}
                href={`/destinations/${encodeURIComponent(suggestion.destination)}`}
                data-animate
                className="group relative block h-64 overflow-hidden rounded-xl md:h-80"
              >
                <Image
                  src={
                    suggestion.imageUrl &&
                    !failedSuggestionImages.has(suggestion.destination)
                      ? suggestion.imageUrl
                      : coverImageFor(suggestion.destination)
                  }
                  alt={suggestion.destination}
                  fill
                  onError={() =>
                    setFailedSuggestionImages((current) =>
                      new Set(current).add(suggestion.destination)
                    )
                  }
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="gradient-overlay absolute inset-0" />
                <div className="absolute bottom-0 left-0 w-full p-stack-md">
                  <h3 className="mb-1 font-headline-lg text-headline-lg text-on-primary">
                    {suggestion.destination}
                  </h3>
                  <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-primary-container">
                    <span className="material-symbols-outlined text-base">
                      {suggestion.icon}
                    </span>
                    {suggestion.blurb}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
