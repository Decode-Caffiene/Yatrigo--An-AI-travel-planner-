"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 128; // matches w-32 below
const MENU_HEIGHT_ESTIMATE = 88; // two rows, used to decide open-up vs open-down

export function MessageActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rendered via a portal at a fixed viewport position (rather than
  // absolutely positioned inline) so it isn't clipped by the messages
  // list's `overflow-y-auto` — an ancestor with overflow:auto clips
  // absolutely-positioned descendants in both directions, not just the
  // scrollable one, which cut off menus opened near the top of the thread.
  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT_ESTIMATE + 8;

    setPosition({
      left: Math.max(8, rect.right - MENU_WIDTH),
      top: openUpward ? rect.top - MENU_HEIGHT_ESTIMATE - 4 : rect.bottom + 4,
    });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    // Closing on scroll is simpler than re-tracking the button's position
    // as the list scrolls underneath a fixed-position portal — but only
    // for scrolling outside the menu itself.
    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        title="Message actions"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-opacity hover:bg-surface-container-low ${
          isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <span className="material-symbols-outlined text-lg">more_vert</span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left, width: MENU_WIDTH }}
            className="z-50 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-xl"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base text-on-surface-variant">
                edit
              </span>
              <span className="font-body-sm text-body-sm text-on-surface">Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base text-error">delete</span>
              <span className="font-body-sm text-body-sm text-error">Delete</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
