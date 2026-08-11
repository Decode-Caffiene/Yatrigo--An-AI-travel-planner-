"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { getDestinationGuide, ApiError } from "@/lib/api";
import type { DestinationGuide } from "@/types";

const COVER_IMAGES = ["/01.jpg", "/02.jpg", "/03.jpg", "/04.jpg", "/05.jpg"];

function coverImageFor(name: string) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return COVER_IMAGES[hash % COVER_IMAGES.length];
}

export default function DestinationGuidePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const destination = decodeURIComponent(name);

  const { isReady } = useRequireAuth();
  const { token } = useAuth();

  const [guide, setGuide] = useState<DestinationGuide | null>(null);
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

    getDestinationGuide(token, destination)
      .then((res) => setGuide(res.guide))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load this guide.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, destination]);

  const scope = usePageEntrance<HTMLDivElement>([isLoading]);

  if (!isReady) return null;

  return (
    <div ref={scope} className="grid grid-cols-4 gap-gutter md:grid-cols-12 md:gap-stack-lg">
      {/* Hero */}
      <section
        data-animate
        className="relative col-span-4 h-64 overflow-hidden rounded-xl md:col-span-12 md:h-80"
      >
        <Image
          src={
            guide?.imageUrl && !imageFailed ? guide.imageUrl : coverImageFor(destination)
          }
          alt={destination}
          fill
          priority
          onError={() => setImageFailed(true)}
          className="object-cover"
        />
        <div className="gradient-overlay absolute inset-0" />
        <div className="absolute bottom-0 left-0 w-full p-stack-lg">
          <h1 className="mb-1 font-headline-xl text-headline-lg-mobile text-on-primary md:text-headline-xl">
            {destination}
          </h1>
          {guide && (
            <p className="font-body-lg text-body-lg text-on-primary-container">
              {guide.tagline}
            </p>
          )}
        </div>
      </section>

      {isLoading && (
        <section className="col-span-4 md:col-span-12">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Generating your guide to {destination}...
          </p>
        </section>
      )}

      {error && !isLoading && (
        <section className="col-span-4 md:col-span-12">
          <div className="rounded-xl border border-dashed border-surface-variant bg-surface-container-lowest p-stack-lg text-center">
            <p className="mb-stack-sm font-body-md text-body-md text-error">{error}</p>
            <Link
              href="/explore"
              className="font-button text-button text-primary underline"
            >
              Back to Explore
            </Link>
          </div>
        </section>
      )}

      {guide && !isLoading && !error && (
        <>
          <section data-animate className="col-span-4 md:col-span-8">
            <h2 className="mb-stack-sm font-headline-md text-headline-md text-on-surface">
              Overview
            </h2>
            <div className="space-y-stack-sm">
              {guide.summary.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="font-body-md text-body-md text-on-surface-variant"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {guide.thingsToDo.length > 0 && (
              <div className="mt-stack-lg">
                <h2 className="mb-stack-sm font-headline-md text-headline-md text-on-surface">
                  Things to Do
                </h2>
                <ul className="space-y-stack-sm">
                  {guide.thingsToDo.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 font-body-md text-body-md text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                        check_circle
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.localTips.length > 0 && (
              <div className="mt-stack-lg">
                <h2 className="mb-stack-sm font-headline-md text-headline-md text-on-surface">
                  Local Tips
                </h2>
                <ul className="space-y-stack-sm">
                  {guide.localTips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 font-body-md text-body-md text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                        lightbulb
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section data-animate className="col-span-4 md:col-span-4">
            <div className="space-y-stack-md rounded-xl border border-surface-variant bg-surface-container-lowest p-stack-md md:p-stack-lg">
              {guide.highlights.length > 0 && (
                <div>
                  <h3 className="mb-stack-sm font-headline-sm text-headline-sm text-on-surface">
                    Highlights
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {guide.highlights.map((highlight, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-label-caps text-label-caps text-primary"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {guide.bestTimeToVisit && (
                <div className="border-t border-surface-variant pt-stack-md">
                  <h3 className="mb-1 font-headline-sm text-headline-sm text-on-surface">
                    Best Time to Visit
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {guide.bestTimeToVisit}
                  </p>
                </div>
              )}

              {guide.estimatedDailyBudget && (
                <div className="border-t border-surface-variant pt-stack-md">
                  <h3 className="mb-1 font-headline-sm text-headline-sm text-on-surface">
                    Estimated Daily Budget
                  </h3>
                  <p className="font-headline-md text-headline-md text-primary">
                    {guide.estimatedDailyBudget}
                  </p>
                </div>
              )}

              <Link
                href={`/trips/new?destination=${encodeURIComponent(destination)}`}
                className="ai-shadow flex items-center justify-center gap-2 rounded-full border-b-2 border-on-primary-fixed-variant bg-primary px-6 py-3 font-button text-button text-on-primary transition-colors hover:bg-on-primary-fixed active:translate-y-0.5 active:border-b-0"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Plan a trip to {destination}
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
