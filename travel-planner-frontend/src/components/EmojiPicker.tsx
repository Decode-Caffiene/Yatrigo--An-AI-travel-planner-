"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import emojiGroups from "unicode-emoji-json/data-by-group.json";

interface EmojiEntry {
  emoji: string;
  name: string;
  slug: string;
}

interface EmojiGroup {
  slug: string;
  name: string;
  emojis: EmojiEntry[];
}

const GROUPS = emojiGroups as EmojiGroup[];

// The dataset's own first entry per group isn't always the most
// recognizable icon for a tab (e.g. symbols' first emoji is "ATM sign") —
// pick friendlier ones for the tab bar while still using the full group
// emoji lists underneath.
const GROUP_TABS: { slug: string; label: string; icon: string }[] = [
  { slug: "smileys_emotion", label: "Smileys", icon: "😀" },
  { slug: "people_body", label: "People", icon: "👋" },
  { slug: "animals_nature", label: "Animals", icon: "🐶" },
  { slug: "food_drink", label: "Food", icon: "🍔" },
  { slug: "travel_places", label: "Travel", icon: "✈️" },
  { slug: "activities", label: "Activities", icon: "⚽" },
  { slug: "objects", label: "Objects", icon: "💡" },
  { slug: "symbols", label: "Symbols", icon: "❤️" },
  { slug: "flags", label: "Flags", icon: "🏳️" },
];

const POPOVER_WIDTH = 336;
const POPOVER_HEIGHT = 400;

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeGroup, setActiveGroup] = useState(GROUP_TABS[0].slug);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const openPicker = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const openUpward = window.innerHeight - rect.bottom < POPOVER_HEIGHT + 8;

    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
      top: openUpward
        ? Math.max(8, rect.top - POPOVER_HEIGHT - 4)
        : rect.bottom + 4,
    });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        !popoverRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    // Scrolling inside the popover's own emoji grid/tabs shouldn't close
    // it — only scrolling the page behind it should, since that would
    // invalidate the fixed position computed relative to the trigger button.
    const handleScroll = (event: Event) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const visibleEmojis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return GROUPS.flatMap((group) =>
        group.emojis.filter((e) => e.name.toLowerCase().includes(q))
      );
    }
    return GROUPS.find((group) => group.slug === activeGroup)?.emojis ?? [];
  }, [query, activeGroup]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        title="Emoji"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
      >
        <span className="material-symbols-outlined text-xl">mood</span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: POPOVER_WIDTH,
              height: POPOVER_HEIGHT,
            }}
            className="z-50 flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-xl"
          >
            <div className="border-b border-surface-variant p-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search emoji..."
                className="w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-1.5 font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none"
              />
            </div>

            {!query && (
              <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-surface-variant px-1.5 py-1.5">
                {GROUP_TABS.map((tab) => (
                  <button
                    key={tab.slug}
                    type="button"
                    onClick={() => setActiveGroup(tab.slug)}
                    title={tab.label}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors ${
                      activeGroup === tab.slug
                        ? "bg-primary/10"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
              {visibleEmojis.length === 0 ? (
                <p className="p-2 text-center font-body-sm text-body-sm text-on-surface-variant">
                  No emoji found.
                </p>
              ) : (
                <div className="grid grid-cols-8 gap-0.5">
                  {visibleEmojis.map((entry) => (
                    <button
                      key={entry.slug}
                      type="button"
                      title={entry.name}
                      onClick={() => {
                        onSelect(entry.emoji);
                        setIsOpen(false);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-surface-container"
                    >
                      {entry.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
