"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { NotificationBell } from "@/components/NotificationBell";
import { searchPlaces } from "@/lib/api";
import { searchDestinations, type DestinationSuggestion } from "@/lib/destinations";

const NAV_LINKS = [
  { label: "Explore", href: "/explore" },
  { label: "Trips", href: "/trips" },
  { label: "Community", href: "/community" },
];

export function Navbar() {
  const { user, token, logout } = useAuth();
  const { unreadCount } = useChat();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const [destination, setDestination] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState<DestinationSuggestion[]>([]);

  useEffect(() => {
    const query = destination.trim();

    if (!token || query.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiveSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPlaces(token, query)
        .then((res) => setLiveSuggestions(res.places))
        .catch(() => setLiveSuggestions([]));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [token, destination]);

  const suggestions = useMemo(() => {
    const local = searchDestinations(destination);
    const localLabels = new Set(local.map((place) => place.label.toLowerCase()));
    const extra = liveSuggestions.filter(
      (place) => !localLabels.has(place.label.toLowerCase())
    );

    return [...local, ...extra].slice(0, 8);
  }, [destination, liveSuggestions]);

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

  const goToDestination = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    router.push(`/trips/new?destination=${encodeURIComponent(trimmed)}`);
    setDestination("");
    setIsSearchFocused(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") goToDestination(event.currentTarget.value);
    if (event.key === "Escape") setIsSearchFocused(false);
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
          <div className="relative hidden md:block">
            <div className="flex items-center rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-fixed-dim">
              <span className="material-symbols-outlined mr-2 text-xl text-outline">
                search
              </span>
              <input
                type="text"
                placeholder="Search destinations..."
                autoComplete="off"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={handleSearchKeyDown}
                className="w-48 border-none bg-transparent text-body-sm font-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:ring-0"
              />
            </div>

            {isSearchFocused && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-64 overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg">
                {suggestions.map((place) => (
                  <li key={place.label}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent the input's blur so the click registers
                        // before the dropdown would otherwise disappear.
                        e.preventDefault();
                        goToDestination(place.label);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-body-sm text-body-sm text-on-surface transition-colors hover:bg-primary/10"
                    >
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">
                        location_on
                      </span>
                      {place.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <NotificationBell />

          <Link
            href="/messages"
            title="Messages"
            className="relative rounded-full p-2 transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              chat_bubble
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-label-caps text-[10px] text-on-error">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

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
