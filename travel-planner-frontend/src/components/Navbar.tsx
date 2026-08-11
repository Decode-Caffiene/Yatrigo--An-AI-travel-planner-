"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { label: "Explore", href: "/explore" },
  { label: "Trips", href: "/trips" },
  { label: "Community", href: "/community" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(navRef.current, {
        opacity: 0,
        y: -16,
        duration: 0.5,
        ease: "power3.out",
      });
    },
    { scope: navRef }
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    const destination = event.currentTarget.value.trim();
    if (destination) {
      router.push(`/trips/new?destination=${encodeURIComponent(destination)}`);
    }
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 w-full bg-surface/80 shadow-sm backdrop-blur-xl"
    >
      <div className="flex h-16 w-full items-center justify-between px-container-padding-mobile md:px-container-padding-desktop">
        <div className="flex items-center gap-stack-md">
          <Link href="/explore" className="flex items-center">
            <Image
              src="/yatrigo-wordmark.png"
              alt="Yatrigo"
              width={478}
              height={162}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <div className="ml-stack-lg hidden items-center gap-stack-md md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`pb-1 font-button text-button transition-colors ${
                  pathname === href
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-stack-md">
          <div className="hidden items-center rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-fixed-dim md:flex">
            <span className="material-symbols-outlined mr-2 text-xl text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Search destinations..."
              onKeyDown={handleSearchKeyDown}
              className="w-48 border-none bg-transparent text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:ring-0"
            />
          </div>

          <button
            type="button"
            title="Coming soon"
            className="cursor-not-allowed rounded-full p-2 opacity-50 transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              notifications
            </span>
          </button>

          <button
            type="button"
            title="Coming soon"
            className="cursor-not-allowed rounded-full p-2 opacity-50 transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              chat_bubble
            </span>
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary text-sm font-semibold text-on-primary transition-transform active:scale-95"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                    <p className="truncate px-3 py-1.5 text-body-sm font-body-sm text-on-surface-variant">
                      {user.name}
                    </p>
                    <Link
                      href={`/community/u/${user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-body-sm font-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-md px-3 py-1.5 text-left text-body-sm font-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
