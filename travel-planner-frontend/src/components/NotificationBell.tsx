"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { Avatar } from "@/components/Avatar";
import { ApiError, listNotifications, markAllNotificationsRead } from "@/lib/api";
import type { AppNotification } from "@/types";

const ICON_BY_TYPE: Record<AppNotification["type"], string> = {
  follow: "person_add",
  like: "favorite",
  comment: "chat_bubble",
  upvote: "arrow_upward",
  best_answer: "verified",
  itinerary_ready: "auto_awesome",
  itinerary_updated: "auto_awesome",
  trip_reminder: "flight_takeoff",
};

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const { token } = useAuth();
  const { unreadNotificationCount, refreshUnreadNotificationCount, subscribeToNotifications } =
    useChat();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    return subscribeToNotifications((notification) => {
      setNotifications((current) => [notification, ...current]);
    });
  }, [token, subscribeToNotifications]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const openPanel = () => {
    setIsOpen(true);
    if (!token) return;

    setIsLoading(true);
    setError(null);
    listNotifications(token)
      .then((res) => setNotifications(res.notifications))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load notifications.")
      )
      .finally(() => setIsLoading(false));

    if (unreadNotificationCount > 0) {
      markAllNotificationsRead(token).then(refreshUnreadNotificationCount);
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openPanel();
    }
  };

  const handleSelect = (notification: AppNotification) => {
    setIsOpen(false);
    router.push(notification.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        title="Notifications"
        className="relative rounded-full p-2 transition-colors hover:bg-surface-container-low"
      >
        <span className="material-symbols-outlined text-on-surface-variant">
          notifications
        </span>
        {unreadNotificationCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-label-caps text-[10px] text-on-error">
            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
          <div className="border-b border-surface-variant px-4 py-3">
            <p className="font-headline-sm text-headline-sm text-on-surface">Notifications</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-container" />
                ))}
              </div>
            )}

            {error && !isLoading && (
              <p className="p-4 font-body-sm text-body-sm text-error">{error}</p>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <p className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                No notifications yet.
              </p>
            )}

            {!isLoading && !error && notifications.length > 0 && (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className={`flex w-full items-start gap-2.5 border-b border-surface-variant/50 p-3 text-left transition-colors hover:bg-surface-container ${
                        notification.read ? "" : "bg-primary/5"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {notification.actor ? (
                          <Avatar
                            name={notification.actor.name}
                            avatar={notification.actor.avatar}
                            size={36}
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-lg">
                              {ICON_BY_TYPE[notification.type]}
                            </span>
                          </div>
                        )}
                        {notification.actor && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-lowest text-primary ring-1 ring-surface-variant">
                            <span className="material-symbols-outlined text-[11px]">
                              {ICON_BY_TYPE[notification.type]}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body-sm text-body-sm text-on-surface">
                          {notification.message}
                        </p>
                        <p className="mt-0.5 font-body-sm text-[11px] text-on-surface-variant">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/community"
            onClick={() => setIsOpen(false)}
            className="block border-t border-surface-variant px-4 py-2.5 text-center font-body-sm text-body-sm text-primary transition-colors hover:bg-surface-container"
          >
            Go to Community
          </Link>
        </div>
      )}
    </div>
  );
}
