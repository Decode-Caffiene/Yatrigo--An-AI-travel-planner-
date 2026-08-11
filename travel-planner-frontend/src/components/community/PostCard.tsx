"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { toggleLike, toggleSave } from "@/lib/api";
import type { Post, PostType } from "@/types";

const TYPE_META: Record<PostType, { label: string; icon: string }> = {
  story: { label: "Story", icon: "auto_stories" },
  review: { label: "Review", icon: "reviews" },
  question: { label: "Question", icon: "help" },
  itinerary: { label: "Itinerary", icon: "map" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PostCard({
  post,
  onUpdate,
}: {
  post: Post;
  onUpdate?: (post: Post) => void;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const meta = TYPE_META[post.type];

  const handleLike = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!token || busy) return;

    setBusy(true);
    try {
      const result = await toggleLike(token, post._id);
      onUpdate?.(result.post);
    } catch {
      // best-effort — the button state simply won't update on failure
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!token || busy) return;

    setBusy(true);
    try {
      const result = await toggleSave(token, post._id);
      onUpdate?.(result.post);
    } catch {
      // best-effort — the button state simply won't update on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      href={`/community/posts/${post._id}`}
      data-animate
      className="hover-lift card-shadow block overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest"
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary text-sm font-semibold text-on-primary">
            {post.user.avatar ? (
              <Image src={post.user.avatar} alt={post.user.name} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {post.user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-button text-button text-on-surface">
              {post.user.name}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {formatDate(post.createdAt)}
              {post.destination ? ` · ${post.destination}` : ""}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-label-caps text-label-caps text-primary">
            <span className="material-symbols-outlined text-sm">{meta.icon}</span>
            {meta.label}
          </span>
        </div>

        {post.type === "review" && post.rating && (
          <div className="mb-2 flex text-secondary">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: `'FILL' ${i < post.rating! ? 1 : 0}` }}
              >
                star
              </span>
            ))}
          </div>
        )}

        <p className="mb-3 line-clamp-3 font-body-md text-body-md text-on-surface">
          {post.content}
        </p>

        {post.images.length > 0 && (
          <div className="relative mb-3 h-56 w-full overflow-hidden rounded-lg">
            <Image src={post.images[0]} alt="" fill className="object-cover" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 border-t border-surface-variant px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1 transition-colors hover:text-primary"
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: `'FILL' ${post.likedByMe ? 1 : 0}` }}
          >
            favorite
          </span>
          {post.likeCount}
        </button>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
          {post.commentCount}
        </span>
        <button
          type="button"
          onClick={handleSave}
          className="ml-auto flex items-center gap-1 transition-colors hover:text-primary"
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: `'FILL' ${post.savedByMe ? 1 : 0}` }}
          >
            bookmark
          </span>
        </button>
      </div>
    </Link>
  );
}
