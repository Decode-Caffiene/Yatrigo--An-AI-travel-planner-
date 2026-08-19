"use client";

import { Suspense, use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { getEventDetails, ApiError } from "@/lib/api";
import type { EventDetails } from "@/types";

function formatEventDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function EventDetailContent({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const eventName = decodeURIComponent(name);
  const searchParams = useSearchParams();

  const venue = searchParams.get("venue") || null;
  const country = searchParams.get("country") || null;
  const date = searchParams.get("date") || null;
  const time = searchParams.get("time") || null;
  const category = searchParams.get("category") || null;

  const { isReady } = useRequireAuth();
  const { token } = useAuth();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!isReady || !token) return;
    // Kicking off a fetch on mount/param change — setIsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setImageFailed(false);

    getEventDetails(token, eventName, country || undefined)
      .then((res) => setEvent(res.event))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load this event.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, eventName, country]);

  const scope = usePageEntrance<HTMLDivElement>([isLoading]);

  if (!isReady) return null;

  const place = [venue, country].filter(Boolean).join(", ");
  const formattedDate = formatEventDate(date);

  return (
    <div ref={scope} className="mx-auto max-w-3xl">
      <Link
        href="/community"
        data-animate
        className="mb-stack-md inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Community
      </Link>

      {/* Hero */}
      <section
        data-animate
        className="relative mb-stack-lg h-56 overflow-hidden rounded-xl md:h-72"
      >
        {event?.imageUrl && !imageFailed ? (
          <>
            <Image
              src={event.imageUrl}
              alt={eventName}
              fill
              priority
              onError={() => setImageFailed(true)}
              className="object-cover"
            />
            <div className="gradient-overlay absolute inset-0" />
          </>
        ) : (
          // No verified real photo of this specific event exists — showing
          // an unrelated stock travel photo here would be exactly the kind
          // of "looks real but isn't" content this page exists to avoid.
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-tertiary">
            <span className="material-symbols-outlined text-8xl text-on-primary/20">
              celebration
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full p-stack-lg">
          <h1 className="mb-1 font-headline-xl text-headline-lg-mobile text-on-primary md:text-headline-xl">
            {eventName}
          </h1>
          {place && (
            <p className="flex items-center gap-1 font-body-md text-body-md text-on-primary-container">
              <span className="material-symbols-outlined text-lg">location_on</span>
              {place}
            </p>
          )}
        </div>
      </section>

      {/* Event details card */}
      <div
        data-animate
        className="card-shadow mb-stack-lg flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-stack-md"
      >
        {formattedDate && (
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Date</p>
            <p className="font-body-md text-body-md text-on-surface">
              {formattedDate}
              {time ? ` · ${time}` : ""}
            </p>
          </div>
        )}
        {category && (
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              Category
            </p>
            <p className="font-body-md text-body-md text-on-surface">{category}</p>
          </div>
        )}
        {place && (
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              Location
            </p>
            <p className="font-body-md text-body-md text-on-surface">{place}</p>
          </div>
        )}
      </div>
      <p className="-mt-stack-md mb-stack-lg font-body-sm text-body-sm text-on-surface-variant">
        Date, category, and location above are AI-estimated — always confirm details
        with an official source before planning around them.
      </p>

      {/* Content */}
      {isLoading && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Looking up {eventName}...
        </p>
      )}

      {error && !isLoading && (
        <p className="font-body-sm text-body-sm text-error">{error}</p>
      )}

      {event && !isLoading && !error && (
        <div
          data-animate
          className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-stack-lg"
        >
          {event.found ? (
            <>
              <div className="mb-stack-sm flex items-center gap-2 font-label-caps text-label-caps text-primary">
                <span className="material-symbols-outlined text-base">verified</span>
                Verified on Wikipedia
              </div>
              <div className="space-y-stack-sm">
                {(event.extract || "").split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="font-body-md text-body-md text-on-surface-variant"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {event.wikipediaUrl && (
                <a
                  href={event.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-stack-md inline-flex items-center gap-1 font-button text-button text-primary hover:underline"
                >
                  Read the full article on Wikipedia
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                </a>
              )}
            </>
          ) : (
            <div className="text-center">
              <span className="material-symbols-outlined mb-2 text-3xl text-outline-variant">
                help_outline
              </span>
              <p className="mb-1 font-body-md text-body-md text-on-surface">
                We couldn&apos;t verify this event.
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                &quot;{eventName}&quot; doesn&apos;t have a Wikipedia article we could
                find, so we can&apos;t confirm it&apos;s real. Double-check before
                planning a trip around it.
              </p>
            </div>
          )}
        </div>
      )}

      {place && (
        <Link
          href={`/trips/new?destination=${encodeURIComponent(place)}`}
          data-animate
          className="mt-stack-lg flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">add_location</span>
          Plan a trip to {place}
        </Link>
      )}
    </div>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <EventDetailContent params={params} />
    </Suspense>
  );
}
