"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const IMAGES = ["/01.jpg", "/02.jpg", "/03.jpg", "/04.jpg", "/05.jpg"];

const INTERVAL_MS = 6500;

export function BackgroundCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % IMAGES.length);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900">
      {IMAGES.map((src, index) => (
        <div
          key={src}
          aria-hidden={index !== activeIndex}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: index === activeIndex ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ))}
      {/* Darken toward the bottom-left so the hero text stays legible on any photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/10" />
    </div>
  );
}
