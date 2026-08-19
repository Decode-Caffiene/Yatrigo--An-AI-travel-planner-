"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { PostCard } from "@/components/community/PostCard";
import {
  ApiError,
  getTopTravelers,
  getTrendingDestinations,
  getUpcomingEvents,
  listPosts,
} from "@/lib/api";
import type { Post, TopTraveler, TravelEvent, TrendingDestination } from "@/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "story", label: "Stories" },
  { key: "review", label: "Reviews" },
  { key: "question", label: "Questions" },
  { key: "itinerary", label: "Itineraries" },
  { key: "following", label: "Following" },
  { key: "saved", label: "Saved" },
];

const EVENTS_PAGE_SIZE = 3;

export default function CommunityPage() {
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();

  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [trending, setTrending] = useState<TrendingDestination[]>([]);
  const [topTravelers, setTopTravelers] = useState<TopTraveler[]>([]);
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENTS_PAGE_SIZE);

  const scope = usePageEntrance<HTMLDivElement>([isLoading]);

  useEffect(() => {
    if (!isReady || !token) return;

    // Kicking off a fetch on filter change — setIsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const filters =
      filter === "following"
        ? { following: true }
        : filter === "saved"
          ? { saved: true }
          : { type: filter };

    listPosts(token, filters)
      .then((res) => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load the feed.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, filter]);

  const handleLoadMore = () => {
    if (!token || isLoadingMore || posts.length === 0) return;

    const filters =
      filter === "following"
        ? { following: true }
        : filter === "saved"
          ? { saved: true }
          : { type: filter };

    setIsLoadingMore(true);
    listPosts(token, { ...filters, before: posts[posts.length - 1].createdAt })
      .then((res) => {
        setPosts((current) => [...current, ...res.posts]);
        setHasMore(res.hasMore);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load more posts.")
      )
      .finally(() => setIsLoadingMore(false));
  };

  useEffect(() => {
    if (!isReady || !token) return;

    getTrendingDestinations(token)
      .then((res) => setTrending(res.destinations))
      .catch(() => setTrending([]));

    getTopTravelers(token)
      .then((res) => setTopTravelers(res.travelers))
      .catch(() => setTopTravelers([]));
  }, [isReady, token]);

  // AI-generated upcoming events spanning many countries (via the same Groq
  // model used for itinerary generation), sorted chronologically by the
  // model's own date estimates — degrades to an empty state if generation
  // fails for any reason. Independent of the trending-destinations list.
  useEffect(() => {
    if (!isReady || !token) return;

    // Kicking off a fetch on mount — setIsEventsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEventsLoading(true);
    getUpcomingEvents(token)
      .then((res) => setEvents(res.events))
      .catch(() => setEvents([]))
      .finally(() => setIsEventsLoading(false));
  }, [isReady, token]);

  const handleLoadMoreEvents = () => {
    setVisibleEventsCount((count) => count + EVENTS_PAGE_SIZE);
  };

  const handlePostUpdate = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  const firstName = useMemo(() => user?.name.split(" ")[0] ?? "there", [user]);

  if (!isReady) return null;

  return (
    <div ref={scope}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: feed */}
        <div className="flex flex-col gap-stack-lg lg:col-span-8">
          {/* Hero / post creation */}
          <section data-animate className="glass-panel card-shadow rounded-xl p-6">
            <h1 className="mb-2 font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Community
            </h1>
            <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
              Share your adventures with travelers worldwide.
            </p>
            <Link href="/community/new" className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex grow flex-col gap-3">
                <div className="w-full rounded-lg border border-surface-variant bg-surface-bright p-3 font-body-md text-body-md text-on-surface-variant transition-colors hover:border-primary">
                  Share a story, review, or question...
                </div>
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-button text-button text-on-primary">
                    <span className="material-symbols-outlined text-lg">add</span>
                    New Post
                  </span>
                </div>
              </div>
            </Link>
          </section>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-4 py-2 font-body-sm text-body-sm transition-colors ${
                  filter === f.key
                    ? "bg-primary text-on-primary"
                    : "border border-surface-variant text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Feed */}
          <section className="flex flex-col gap-gutter">
            {isLoading && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Loading feed...
              </p>
            )}
            {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

            {!isLoading && !error && posts.length === 0 && (
              <div className="card-shadow rounded-xl border border-dashed border-surface-variant bg-surface-container-lowest p-stack-lg text-center">
                <p className="mb-stack-sm font-body-md text-body-md text-on-surface-variant">
                  {filter === "all"
                    ? "No posts yet."
                    : "Nothing here yet."}
                </p>
                <Link
                  href="/community/new"
                  className="font-button text-button text-primary underline"
                >
                  Be the first to share something
                </Link>
              </div>
            )}

            {posts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={handlePostUpdate} />
            ))}

            {!isLoading && hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="mx-auto rounded-full border border-surface-variant px-6 py-2.5 font-button text-button text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </section>
        </div>

        {/* Right column: sidebar */}
        <aside className="flex flex-col gap-stack-lg lg:col-span-4">
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface p-6"
          >
            <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              Trending Destinations
            </h3>
            {trending.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Could not load trending destinations right now.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trending.map((t) => (
                  <Link
                    key={t.destination}
                    href={`/trips/new?destination=${encodeURIComponent(t.destination)}`}
                    className="rounded-full border border-outline-variant px-4 py-2 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
                  >
                    {t.destination}
                    {t.reason && (
                      <span className="text-on-surface-variant"> · {t.reason}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface p-6"
          >
            <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
              <span>🏆</span> Top Travelers
            </h3>
            {topTravelers.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Complete a trip to appear here, {firstName}.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {topTravelers.map((traveler, i) => (
                  <li key={traveler.id}>
                    <Link
                      href={`/community/u/${traveler.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-bright"
                    >
                      <span className="text-xl">
                        {["🥇", "🥈", "🥉"][i] ?? "🎖️"}
                      </span>
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary text-xs font-semibold text-on-primary">
                        {traveler.avatar ? (
                          <Image
                            src={traveler.avatar}
                            alt={traveler.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            {traveler.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-button text-button text-on-surface">
                          {traveler.name}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {traveler.countriesCount} countries · {traveler.postCount} posts
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface p-6"
          >
            <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
              <span>📅</span> Upcoming Events
            </h3>
            {isEventsLoading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Generating events...
              </p>
            ) : events.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No upcoming events found right now.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {events.slice(0, visibleEventsCount).map((event) => {
                    const place = [event.venue, event.country]
                      .filter(Boolean)
                      .join(", ");

                    const eventParams = new URLSearchParams();
                    if (event.venue) eventParams.set("venue", event.venue);
                    if (event.country) eventParams.set("country", event.country);
                    if (event.date) eventParams.set("date", event.date);
                    if (event.time) eventParams.set("time", event.time);
                    if (event.category) eventParams.set("category", event.category);

                    return (
                      <li key={`${event.name}-${event.date}`}>
                        <Link
                          href={`/events/${encodeURIComponent(event.name)}?${eventParams.toString()}`}
                          className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-bright"
                        >
                          <div className="flex min-w-12 flex-col items-center justify-center rounded bg-primary-container p-2 text-on-primary-container">
                            <span className="font-label-caps text-label-caps uppercase">
                              {event.date
                                ? new Date(event.date).toLocaleDateString(undefined, {
                                    month: "short",
                                  })
                                : "TBD"}
                            </span>
                            <span className="font-button text-button">
                              {event.date ? new Date(event.date).getDate() : "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-button text-button text-on-surface">
                              {event.name}
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                              {place || "Location TBD"}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {visibleEventsCount < events.length && (
                  <button
                    type="button"
                    onClick={handleLoadMoreEvents}
                    className="mt-3 w-full rounded-lg border border-surface-variant py-2 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="-mx-container-padding-mobile mt-16 border-t border-surface-variant bg-surface-container-low md:-mx-container-padding-desktop">
        <div className="mx-auto max-w-360 px-container-padding-mobile py-10 md:px-container-padding-desktop">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-3 md:items-start">
              <Image
                src="/yatrigo-wordmark.png"
                alt="Yatrigo"
                width={478}
                height={162}
                className="h-7 w-auto"
              />
              <p className="max-w-xs text-center font-body-sm text-body-sm text-on-surface-variant md:text-left">
                Empowering global explorers with AI-driven itineraries and a
                vibrant community.
              </p>
            </div>

            <nav className="flex items-center gap-6 md:gap-8">
              <Link
                href="/explore"
                className="font-button text-button text-on-surface-variant transition-colors hover:text-primary"
              >
                Destinations
              </Link>
              <Link
                href="/trips"
                className="font-button text-button text-on-surface-variant transition-colors hover:text-primary"
              >
                Trips
              </Link>
              <Link
                href="/community"
                className="font-button text-button text-on-surface-variant transition-colors hover:text-primary"
              >
                Community
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-surface-variant pt-6 text-center font-body-sm text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} Yatrigo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
