"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type { ChatAttachmentType } from "@/types";

const MENU_ITEMS: { kind: ChatAttachmentType; label: string; icon: string; accept: string }[] = [
  { kind: "image", label: "Photo", icon: "photo_camera", accept: "image/*" },
  { kind: "file", label: "File", icon: "attach_file", accept: "*/*" },
];

export function AttachmentMenu({
  onSelectFile,
  disabled,
}: {
  onSelectFile: (file: File, kind: ChatAttachmentType) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<ChatAttachmentType>("file");

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const triggerPicker = (kind: ChatAttachmentType, accept: string) => {
    pendingKindRef.current = kind;
    if (inputRef.current) {
      inputRef.current.accept = accept;
      inputRef.current.click();
    }
    setIsOpen(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onSelectFile(file, pendingKindRef.current);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        title="Attach"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-xl">add_circle</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {isOpen && (
        <div className="absolute bottom-12 left-0 z-20 w-44 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-xl">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => triggerPicker(item.kind, item.accept)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-lg text-primary">
                {item.icon}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
