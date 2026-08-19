"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { airlineLogoUrl } from "@/lib/airlines";

/**
 * Airline logo by IATA code that renders nothing when the logo CDN has no
 * image for that code (small carriers 404 there) — a missing logo should
 * never show up as a broken image.
 */
export function AirlineLogo({
  code,
  alt,
  size,
  className,
}: {
  code?: string | null;
  alt: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = airlineLogoUrl(code);

  // A previous code's failure shouldn't hide the next code's logo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false);
  }, [src]);

  if (!src || failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      // Logos are local 64px PNGs of a few KB — the optimizer round-trip
      // would only slow their first paint down.
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
