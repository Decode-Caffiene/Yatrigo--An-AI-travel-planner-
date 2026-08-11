"use client";

import { useRef, type DependencyList } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * Fades/slides in every descendant marked `data-animate` inside the
 * returned ref, staggered in source order. Re-runs when `deps` change,
 * so pages that reveal content after an async fetch (e.g. trip lists)
 * can pass a dependency like `[isLoading]` to animate once data lands.
 */
export function usePageEntrance<T extends HTMLElement = HTMLDivElement>(
  deps: DependencyList = []
) {
  const scope = useRef<T>(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-animate]", scope.current);
      if (targets.length === 0) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      // fromTo (not from) + overwrite so a re-run triggered by `deps`
      // (e.g. data finishing loading) can never leave a target stuck
      // mid-animation from a tween that was still in flight.
      gsap.fromTo(
        targets,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: "auto",
          clearProps: "transform",
        }
      );
    },
    { scope, dependencies: [...deps] }
  );

  return scope;
}
