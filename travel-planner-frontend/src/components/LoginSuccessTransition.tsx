"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * Full-screen branded splash shown right after a successful sign-in, before
 * navigating away — the logo animates in, holds briefly, then fades out and
 * `onComplete` fires to trigger the actual navigation. Turns an instant
 * jump-cut into a deliberate "welcome" beat instead.
 */
export function LoginSuccessTransition({ onComplete }: { onComplete: () => void }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        onComplete();
        return;
      }

      gsap
        .timeline({ onComplete })
        .fromTo(scope.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" })
        .fromTo(
          ".login-success-logo",
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.1"
        )
        .to(scope.current, { opacity: 0, duration: 0.35, ease: "power2.in" }, "+=0.4");
    },
    { scope }
  );

  return (
    <div
      ref={scope}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary"
    >
      <Image
        src="/yatrigo-logo.png"
        alt="Yatrigo"
        width={468}
        height={596}
        className="login-success-logo h-32 w-auto drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)] sm:h-40"
        priority
      />
    </div>
  );
}
