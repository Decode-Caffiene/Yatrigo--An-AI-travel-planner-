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
  getAIEvents,
  getTopTravelers,
  getTrendingDestinations,
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

export default function CommunityPage() {
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();

  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trending, setTrending] = useState<TrendingDestination[]>([]);
  const [topTravelers, setTopTravelers] = useState<TopTraveler[]>([]);
  const [events, setEvents] = useState<TravelEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);

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
      .then((res) => setPosts(res.posts))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load the feed.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, filter]);

  useEffect(() => {
    if (!isReady || !token) return;

    getTrendingDestinations(token)
      .then((res) => setTrending(res.destinations))
      .catch(() => setTrending([]));

    getTopTravelers(token)
      .then((res) => setTopTravelers(res.travelers))
      .catch(() => setTopTravelers([]));
  }, [isReady, token]);

  // AI-generated upcoming events for the top trending destination (via the
  // same Groq model used for itinerary generation) — degrades to an empty
  // state if generation fails for any reason.
  useEffect(() => {
    if (!isReady || !token || trending.length === 0) return;

    // Kicking off a fetch when the trending destination becomes known —
    // setIsEventsLoading(true) runs synchronously, the rest resolves async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEventsLoading(true);
    getAIEvents(token, trending[0].destination)
      .then((res) => setEvents(res.events.slice(0, 3)))
      .catch(() => setEvents([]))
      .finally(() => setIsEventsLoading(false));
  }, [isReady, token, trending]);

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
                Not enough activity yet this week.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trending.map((t) => (
                  <Link
                    key={t.destination}
                    href={`/trips/new?destination=${encodeURIComponent(t.destination)}`}
                    className="rounded-full border border-outline-variant px-4 py-2 font-body-sm text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
                  >
                    {t.destination}{" "}
                    <span className="text-on-surface-variant">· {t.count}</span>
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
            <h3 className="mb-1 flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
              <span>📅</span> Upcoming Events
            </h3>
            <p className="mb-4 flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              AI-generated, not verified real-time listings
            </p>
            {isEventsLoading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Generating events...
              </p>
            ) : events.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No upcoming events found right now.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {events.map((event) => (
                  <li key={event.name}>
                    <Link
                      href={`/trips/new?destination=${encodeURIComponent(event.venue || trending[0]?.destination || "")}`}
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
                          {event.venue || trending[0]?.destination}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-surface-variant bg-surface px-0 py-12">
        <div className="mx-auto grid max-w-360 grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Image
                src="/yatrigo-wordmark.png"
                alt="Yatrigo"
                width={478}
                height={162}
                className="h-6 w-auto opacity-80"
              />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Empowering global explorers with AI-driven itineraries and a vibrant
              community.
            </p>
          </div>
          <div>
            <h4 className="mb-4 font-button text-button text-on-surface">Explore</h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link href="/explore" className="transition-colors hover:text-primary">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/trips" className="transition-colors hover:text-primary">
                  Trips
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="transition-colors hover:text-primary"
                >
                  Community
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-button text-button text-on-surface">Support</h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <span className="cursor-not-allowed opacity-60">Help Center</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">Safety</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">
                  Cancellation Options
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-button text-button text-on-surface">Legal</h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <span className="cursor-not-allowed opacity-60">Terms of Service</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">Privacy Policy</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">Cookie Policy</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-360 border-t border-surface-variant pt-8 text-center font-body-sm text-body-sm text-on-surface-variant">
          © {new Date().getFullYear()} Yatrigo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
