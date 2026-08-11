"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useAuth } from "@/lib/auth-context";
import { getDestinationImage } from "@/lib/api";

const COVER_IMAGES = ["/01.jpg", "/02.jpg", "/03.jpg", "/04.jpg", "/05.jpg"];

// Module-level cache so every card for the same destination across the app
// shares one lookup instead of re-fetching per card/re-render.
const imageCache = new Map<string, string | null>();

function fallbackImageFor(destination: string) {
  const hash = [...destination].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return COVER_IMAGES[hash % COVER_IMAGES.length];
}

/**
 * Trip/destination cover photo. Shows a deterministic local placeholder
 * immediately, then swaps in the real Wikipedia photo for that place once
 * it resolves (or keeps the placeholder if none exists).
 */
export function DestinationImage({
  destination,
  alt,
  className,
}: {
  destination: string;
  alt: string;
  className?: string;
}) {
  const { token } = useAuth();
  const [src, setSrc] = useState(
    () => imageCache.get(destination) || fallbackImageFor(destination)
  );

  useEffect(() => {
    if (!token || imageCache.has(destination)) return;

    getDestinationImage(token, destination)
      .then((res) => {
        imageCache.set(destination, res.imageUrl);
        if (res.imageUrl) setSrc(res.imageUrl);
      })
      .catch(() => {});
  }, [token, destination]);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      onError={() => setSrc(fallbackImageFor(destination))}
      className={className}
    />
  );
}
