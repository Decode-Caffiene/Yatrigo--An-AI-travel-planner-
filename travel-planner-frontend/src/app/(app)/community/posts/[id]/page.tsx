"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import {
  ApiError,
  addComment,
  copyItineraryFromPost,
  deletePost,
  getPost,
  markBestAnswer,
  toggleCommentUpvote,
  toggleLike,
  toggleSave,
} from "@/lib/api";
import type { Comment, Post, PostType } from "@/types";

const TYPE_META: Record<PostType, { label: string; icon: string }> = {
  story: { label: "Story", icon: "auto_stories" },
  review: { label: "Review", icon: "reviews" },
  question: { label: "Question", icon: "help" },
  itinerary: { label: "Itinerary", icon: "map" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isReady || !token) return;

    // Kicking off a fetch on mount/param change — setIsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getPost(token, id)
      .then((res) => {
        setPost(res.post);
        setComments(res.comments);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load post.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, id]);

  if (!isReady) return null;
  if (isLoading) return <p className="font-body-sm text-body-sm text-on-surface-variant">Loading post...</p>;
  if (loadError) return <p className="font-body-sm text-body-sm text-error">{loadError}</p>;
  if (!post) return null;

  const meta = TYPE_META[post.type];
  const isOwnPost = user?.id === post.user.id;

  const handleLike = async () => {
    if (!token) return;
    const result = await toggleLike(token, post._id);
    setPost(result.post);
  };

  const handleSave = async () => {
    if (!token) return;
    const result = await toggleSave(token, post._id);
    setPost(result.post);
  };

  const handleAddComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !commentText.trim()) return;

    setCommentError(null);
    setIsCommenting(true);

    try {
      const result = await addComment(token, post._id, commentText);
      setComments((prev) => [...prev, result.comment]);
      setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof ApiError ? err.message : "Could not add comment.");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleUpvote = async (commentId: string) => {
    if (!token) return;
    const result = await toggleCommentUpvote(token, post._id, commentId);
    setComments((prev) => prev.map((c) => (c._id === commentId ? result.comment : c)));
  };

  const handleMarkBestAnswer = async (commentId: string) => {
    if (!token) return;
    const result = await markBestAnswer(token, post._id, commentId);
    setPost(result.post);
  };

  const handleCopyItinerary = async () => {
    if (!token) return;
    setCopyError(null);
    setIsCopying(true);

    try {
      const result = await copyItineraryFromPost(token, post._id);
      router.push(`/trips/${result.trip._id}`);
    } catch (err) {
      setCopyError(err instanceof ApiError ? err.message : "Could not copy itinerary.");
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await deletePost(token, post._id);
      router.push("/community");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete post.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/community"
        className="mb-stack-md inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to community
      </Link>

      <article className="card-shadow overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <Link href={`/community/u/${post.user.id}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary text-on-primary">
              {post.user.avatar ? (
                <Image src={post.user.avatar} alt={post.user.name} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-semibold">
                  {post.user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/community/u/${post.user.id}`} className="font-button text-button text-on-surface hover:text-primary">
                {post.user.name}
              </Link>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {formatDate(post.createdAt)}
                {post.destination ? ` · ${post.destination}` : ""}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-label-caps text-label-caps text-primary">
              <span className="material-symbols-outlined text-sm">{meta.icon}</span>
              {meta.label}
            </span>
            {isOwnPost && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete post"
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:text-error disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
          </div>

          {post.type === "review" && post.rating && (
            <div className="mb-3 flex text-secondary">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: `'FILL' ${i < post.rating! ? 1 : 0}` }}
                >
                  star
                </span>
              ))}
            </div>
          )}

          <p className="mb-4 whitespace-pre-wrap font-body-lg text-body-lg text-on-surface">
            {post.content}
          </p>

          {post.images.length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {post.images.map((url) => (
                <div key={url} className="relative h-56 overflow-hidden rounded-lg">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {post.type === "review" && post.review && (
            <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg bg-surface-container p-4 sm:grid-cols-2">
              {post.review.budget != null && (
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Budget
                  </p>
                  <p className="font-button text-button text-on-surface">
                    ${post.review.budget.toLocaleString()}
                  </p>
                </div>
              )}
              {post.review.bestTimeToVisit && (
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Best time to visit
                  </p>
                  <p className="font-button text-button text-on-surface">
                    {post.review.bestTimeToVisit}
                  </p>
                </div>
              )}
              {post.review.pros.length > 0 && (
                <div>
                  <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Pros
                  </p>
                  <ul className="list-inside list-disc font-body-sm text-body-sm text-on-surface">
                    {post.review.pros.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {post.review.cons.length > 0 && (
                <div>
                  <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Cons
                  </p>
                  <ul className="list-inside list-disc font-body-sm text-body-sm text-on-surface">
                    {post.review.cons.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {post.type === "itinerary" && post.itinerarySnapshot && (
            <div className="mb-4 rounded-lg bg-surface-container p-4">
              <p className="mb-2 font-body-md text-body-md text-on-surface">
                {post.itinerarySnapshot.summary}
              </p>
              <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
                Est. budget: {post.itinerarySnapshot.totalEstimatedBudget}{" "}
                {post.itinerarySnapshot.currency} ·{" "}
                {post.itinerarySnapshot.days?.length ?? 0} days
              </p>
              <button
                type="button"
                onClick={handleCopyItinerary}
                disabled={isCopying}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                {isCopying ? "Copying..." : "Copy to My Trips"}
              </button>
              {copyError && (
                <p className="mt-2 font-body-sm text-body-sm text-error">{copyError}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-6 border-t border-surface-variant pt-4 font-body-sm text-body-sm text-on-surface-variant">
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
              {post.savedByMe ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </article>

      {/* Comments */}
      <section className="mt-stack-lg">
        <h2 className="mb-stack-md font-headline-md text-headline-md text-on-surface">
          {post.type === "question" ? "Answers" : "Comments"} ({comments.length})
        </h2>

        <form onSubmit={handleAddComment} className="mb-stack-md flex gap-3">
          <input
            type="text"
            placeholder={post.type === "question" ? "Write an answer..." : "Add a comment..."}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 rounded-lg border border-surface-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={isCommenting || !commentText.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isCommenting ? "..." : "Post"}
          </button>
        </form>
        {commentError && (
          <p className="mb-stack-md font-body-sm text-body-sm text-error">{commentError}</p>
        )}

        <div className="flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No {post.type === "question" ? "answers" : "comments"} yet.
            </p>
          )}
          {comments
            .slice()
            .sort((a, b) => {
              if (a._id === post.bestAnswerComment) return -1;
              if (b._id === post.bestAnswerComment) return 1;
              return 0;
            })
            .map((comment) => (
              <div
                key={comment._id}
                className={`card-shadow rounded-lg border p-4 ${
                  comment._id === post.bestAnswerComment
                    ? "border-primary bg-primary/5"
                    : "border-surface-variant bg-surface-container-lowest"
                }`}
              >
                {comment._id === post.bestAnswerComment && (
                  <p className="mb-2 flex items-center gap-1 font-label-caps text-label-caps text-primary">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Best answer
                  </p>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary text-xs font-semibold text-on-primary">
                    {comment.user.avatar ? (
                      <Image src={comment.user.avatar} alt={comment.user.name} fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <Link href={`/community/u/${comment.user.id}`} className="font-button text-button text-on-surface hover:text-primary">
                    {comment.user.name}
                  </Link>
                </div>
                <p className="mb-2 font-body-md text-body-md text-on-surface">{comment.content}</p>
                <div className="flex items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
                  <button
                    type="button"
                    onClick={() => handleUpvote(comment._id)}
                    className="flex items-center gap-1 transition-colors hover:text-primary"
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: `'FILL' ${comment.upvotedByMe ? 1 : 0}` }}
                    >
                      thumb_up
                    </span>
                    {comment.upvoteCount}
                  </button>
                  {post.type === "question" && isOwnPost && !post.bestAnswerComment && (
                    <button
                      type="button"
                      onClick={() => handleMarkBestAnswer(comment._id)}
                      className="text-primary hover:underline"
                    >
                      Mark as best answer
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
