"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { listTrips, ApiError } from "@/lib/api";
import { DestinationImage } from "@/components/DestinationImage";
import type { Trip, TripStatus } from "@/types";

const STATUS_META: Record<TripStatus, { label: string; icon: string }> = {
  planning: { label: "Planning", icon: "edit_calendar" },
  completed: { label: "Completed", icon: "check_circle" },
  cancelled: { label: "Cancelled", icon: "cancel" },
};

const STATUS_FILTERS: { value: TripStatus | "all"; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const AI_SUGGESTIONS = [
  {
    city: "Seoul, South Korea",
    tag: "K-pop + Food",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_NrK_jcNgdrmf_gDVXm2Hal_VAWxsJ2CdvOqVx8t-rz2d_z2ApEajbALMMapzMMjGKaxMUY1IYT4pk2MqRhPbdshkDpTy0RhXmJa19ADJuwwewbvTHhLIdOeJpOUpbX-qhuP_9AYOkx6IQ-UNuW07Joc_HyJ8MUlHNP4vm_wg6dbrUELy7NlDbLdaf4rT1LxgccCIpASwpIPGH6V_ewojQQdY2vHiN1TRg2IV-rHns-5wQtS7E9oz8Q",
  },
  {
    city: "Taiwan",
    tag: "Night Markets",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwWYaxptdGeOgfvI1_wmIHr9GlWuJDnZj3dwl963WieFcdNnS9dnROqmcQB5j6eQwIbIljKT0_X3uWjdQFJT0vn-78SMaAX5CwONGe2hUi9eJiNCJ-MJ8Plcsyie0i35S8k7PF4VRN5jWGWdYpGFb8ca7lA3DeWclJP7Jyo-shtv98vEkNEK1kbiaO9NsG8EoLyI9WjX-r2n267oI-eGTDL9PVtTI8yhQSrXuxZqjPq95tCQLb0GwnTA",
  },
  {
    city: "Vietnam",
    tag: "Street Food",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAhEHEqLTHdU9bVY-qIv6KZdQG7qZcdIkkKl7zCBni0fWFTCIBPXMlztcn7gTRPL4vSbnIRqVl86sH080os4sEysMLs6_1KMArA8FEO1Bqc7gZhmdg-zQU0b7MDddG-HHY7M7I76ozcgSK-1YcE1FgOrEJw0zzBnD-htly8rrO2Aj_KdPCDRTfNuBUuvYAvCuhzBFtfVTp4kuw1YzoEZc9dhcGRyIzJlPTbdx8Nhk7AJv_UcH_DUgb4gg",
  },
];

const QUICK_ACTIONS = [
  { label: "Create Trip", icon: "add_location", href: "/trips/new" },
  { label: "Export Itinerary", icon: "ios_share", stub: true },
  { label: "Regenerate AI Plan", icon: "refresh", stub: true },
  { label: "Browse Destinations", icon: "travel_explore", href: "/explore" },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function tripDurationDays(startDate: string, endDate: string) {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function TripsPage() {
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("planning");

  useEffect(() => {
    if (!isReady || !token) return;

    listTrips(token)
      .then((res) => setTrips(res.trips))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load trips.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token]);

  const upcomingTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.status === "planning")
        .sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
    [trips]
  );

  const visibleTrips = useMemo(
    () =>
      trips
        .filter((trip) => statusFilter === "all" || trip.status === statusFilter)
        .sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
    [trips, statusFilter]
  );

  const recentTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [trips]
  );

  const tripsWithoutItinerary = useMemo(
    () => upcomingTrips.filter((trip) => !trip.itinerary),
    [upcomingTrips]
  );

  const stats = useMemo(
    () => ({
      total: trips.length,
      upcoming: upcomingTrips.length,
      completed: trips.filter((trip) => trip.status === "completed").length,
      countries: new Set(trips.map((trip) => trip.destination)).size,
    }),
    [trips, upcomingTrips]
  );

  const lastCompletedDestination = useMemo(
    () => trips.find((trip) => trip.status === "completed")?.destination,
    [trips]
  );

  const firstName = user?.name.split(" ")[0] ?? "there";

  const scope = usePageEntrance<HTMLDivElement>([isLoading]);

  if (!isReady) return null;

  return (
    <div ref={scope}>
      {/* Hero */}
      <header className="mb-stack-lg flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div data-animate>
          <h1 className="mb-2 font-headline-xl text-headline-lg-mobile text-on-surface md:text-headline-xl">
            Good to see you, {firstName}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Ready to plan your next adventure?
          </p>
        </div>
        <Link
          href="/trips/new"
          data-animate
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined">add</span>
          Create New Trip
        </Link>
      </header>

      {error && <p className="mb-stack-md font-body-sm text-body-sm text-error">{error}</p>}

      {/* Stats */}
      <section className="mb-stack-lg grid grid-cols-2 gap-gutter md:grid-cols-4">
        <div
          data-animate
          className="card-shadow flex flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-4 text-center"
        >
          <span className="font-headline-lg text-headline-lg text-primary">
            {stats.total}
          </span>
          <span className="mt-1 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Total Trips
          </span>
        </div>
        <div
          data-animate
          className="card-shadow flex flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-4 text-center"
        >
          <span className="font-headline-lg text-headline-lg text-secondary">
            {stats.upcoming}
          </span>
          <span className="mt-1 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Upcoming
          </span>
        </div>
        <div
          data-animate
          className="card-shadow flex flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-4 text-center"
        >
          <span className="font-headline-lg text-headline-lg text-outline">
            {stats.completed}
          </span>
          <span className="mt-1 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Completed
          </span>
        </div>
        <div
          data-animate
          className="card-shadow flex flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-4 text-center"
        >
          <span className="font-headline-lg text-headline-lg text-tertiary">
            {stats.countries}
          </span>
          <span className="mt-1 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Destinations
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-stack-lg lg:col-span-2">
          <section id="upcoming-trips">
            <div className="mb-stack-md flex flex-wrap items-center justify-between gap-stack-sm">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                {statusFilter === "planning"
                  ? "Upcoming Trips"
                  : statusFilter === "all"
                    ? "All Trips"
                    : `${STATUS_META[statusFilter].label} Trips`}
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`rounded-full border px-3.5 py-1.5 font-body-sm text-body-sm transition-colors ${
                      statusFilter === filter.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Loading trips...
              </p>
            )}

            {!isLoading && !error && visibleTrips.length === 0 && (
              <div className="card-shadow rounded-xl border border-dashed border-surface-variant bg-surface-container-lowest p-stack-lg text-center">
                <p className="mb-stack-sm font-body-md text-body-md text-on-surface-variant">
                  {statusFilter === "planning"
                    ? "No upcoming trips yet."
                    : `No ${statusFilter === "all" ? "" : STATUS_META[statusFilter].label.toLowerCase() + " "}trips yet.`}
                </p>
                <Link
                  href="/trips/new"
                  className="font-button text-button text-primary underline"
                >
                  Plan your next adventure
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-gutter">
              {visibleTrips.map((trip) => (
                <div
                  key={trip._id}
                  data-animate
                  className="hover-lift card-shadow flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest md:flex-row"
                >
                  <div className="relative h-48 w-full md:h-auto md:w-1/3">
                    <DestinationImage
                      destination={trip.destination}
                      alt={trip.destination}
                      className="object-cover"
                    />
                    <div className="gradient-overlay absolute inset-0 flex items-end p-4">
                      <h3 className="font-headline-md text-headline-md text-on-primary">
                        {trip.destination}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="mb-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/20 px-3 py-1 font-label-caps text-label-caps text-on-secondary-container">
                          <span className="material-symbols-outlined text-sm">
                            {STATUS_META[trip.status].icon}
                          </span>
                          {STATUS_META[trip.status].label}
                        </span>
                        {trip.itinerary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-label-caps text-label-caps text-primary">
                            <span className="material-symbols-outlined text-sm">
                              auto_awesome
                            </span>
                            AI Ready
                          </span>
                        )}
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-4 font-body-sm text-body-sm text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            calendar_today
                          </span>
                          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            schedule
                          </span>
                          {tripDurationDays(trip.startDate, trip.endDate)} Days
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            payments
                          </span>
                          Budget: ${trip.budget.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            group
                          </span>
                          {trip.travelers} Traveler{trip.travelers > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {trip.interests.length > 0 && (
                      <div>
                        <p className="mb-2 font-body-sm text-body-sm text-on-surface-variant">
                          Interests:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {trip.interests.map((interest) => (
                            <span
                              key={interest}
                              className="rounded bg-surface-container px-2 py-1 text-xs font-medium"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/trips/${trip._id}?tab=details`}
                      className="mt-4 self-start font-button text-button text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Planning assistant */}
          {tripsWithoutItinerary.length > 0 && (
            <section
              data-animate
              className="rounded-xl bg-linear-to-br from-primary-fixed to-secondary-fixed p-px"
            >
              <div className="h-full rounded-xl bg-surface-container-lowest/90 p-6 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container/20">
                    <span className="material-symbols-outlined text-3xl text-primary">
                      smart_toy
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 font-headline-md text-headline-md text-on-surface">
                      Continue Planning
                    </h3>
                    <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
                      {`You have ${tripsWithoutItinerary.length} trip${
                        tripsWithoutItinerary.length > 1 ? "s that don't" : " that doesn't"
                      } have an AI itinerary yet. Let AI help you plan the details.`}
                    </p>
                    <Link
                      href={`/trips/${tripsWithoutItinerary[0]._id}?tab=itinerary`}
                      className="flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-button text-button text-on-primary transition-colors hover:bg-primary/90"
                    >
                      Complete Itineraries
                      <span className="material-symbols-outlined text-lg">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right column: sidebar */}
        <aside className="flex flex-col gap-stack-lg">
          {/* Recent trips */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Recent Trips
              </h3>
              <a
                href="#upcoming-trips"
                className="font-body-sm text-body-sm text-primary hover:underline"
              >
                View All
              </a>
            </div>

            {recentTrips.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No trips yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {recentTrips.slice(0, 4).map((trip) => (
                  <li key={trip._id}>
                    <Link
                      href={`/trips/${trip._id}`}
                      className="group flex items-center gap-3"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                        <DestinationImage
                          destination={trip.destination}
                          alt={trip.destination}
                          className="object-cover grayscale transition-all group-hover:grayscale-0"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-body-md text-body-md font-semibold text-on-surface transition-colors group-hover:text-primary">
                          {trip.destination}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {STATUS_META[trip.status].label}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary">
                        chevron_right
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Suggestions */}
          <div
            data-animate
            className="card-shadow relative overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-secondary-fixed-dim/20 blur-2xl" />
            <h3 className="relative z-10 mb-1 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              AI Suggestions
              <span className="material-symbols-outlined text-secondary-container">
                auto_awesome
              </span>
            </h3>
            <p className="relative z-10 mb-4 font-body-sm text-body-sm text-on-surface-variant">
              {lastCompletedDestination
                ? `Because you enjoyed ${lastCompletedDestination}...`
                : "Curated picks to get you started..."}
            </p>
            <div className="relative z-10 space-y-3">
              {AI_SUGGESTIONS.map((suggestion) => (
                <Link
                  key={suggestion.city}
                  href={`/trips/new?destination=${encodeURIComponent(suggestion.city)}`}
                  className="group relative block h-24 cursor-pointer overflow-hidden rounded-lg"
                >
                  <Image
                    src={suggestion.imageUrl}
                    alt={suggestion.city}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/50 transition-colors group-hover:bg-black/40" />
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <h4 className="font-button text-button text-on-primary">
                      {suggestion.city}
                    </h4>
                    <p className="font-label-caps text-label-caps text-on-primary/80">
                      {suggestion.tag}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <h3 className="mb-4 font-headline-md text-headline-md text-on-surface">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) =>
                action.stub ? (
                  <button
                    key={action.label}
                    type="button"
                    title="Coming soon"
                    className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg bg-surface-container p-4 text-center opacity-60"
                  >
                    <span className="material-symbols-outlined text-primary">
                      {action.icon}
                    </span>
                    <span className="font-body-sm text-body-sm font-medium">
                      {action.label}
                    </span>
                  </button>
                ) : (
                  <Link
                    key={action.label}
                    href={action.href!}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container p-4 text-center transition-colors hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-primary">
                      {action.icon}
                    </span>
                    <span className="font-body-sm text-body-sm font-medium">
                      {action.label}
                    </span>
                  </Link>
                )
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
