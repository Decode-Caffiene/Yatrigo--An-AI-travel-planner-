"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { PostCard } from "@/components/community/PostCard";
import {
  ApiError,
  followUser,
  getUserProfile,
  listPosts,
  startConversation,
  updateProfile,
  uploadImage,
} from "@/lib/api";
import type { Post, UserProfile } from "@/types";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { isReady } = useRequireAuth();
  const { token } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [isMessageBusy, setIsMessageBusy] = useState(false);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!isReady || !token) return;

    // Kicking off a fetch on mount/param change — setIsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    Promise.all([getUserProfile(token, userId), listPosts(token, { author: userId })])
      .then(([profileRes, postsRes]) => {
        setProfile(profileRes.profile);
        setBioDraft(profileRes.profile.bio);
        setPosts(postsRes.posts);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load profile.")
      )
      .finally(() => setIsLoading(false));
  }, [isReady, token, userId]);

  if (!isReady) return null;
  if (isLoading) return <p className="font-body-sm text-body-sm text-on-surface-variant">Loading profile...</p>;
  if (error) return <p className="font-body-sm text-body-sm text-error">{error}</p>;
  if (!profile) return null;

  const handleFollow = async () => {
    if (!token || isFollowBusy) return;
    setIsFollowBusy(true);
    try {
      const result = await followUser(token, userId);
      setProfile((prev) =>
        prev
          ? { ...prev, isFollowedByMe: result.isFollowedByMe, followerCount: result.followerCount }
          : prev
      );
    } finally {
      setIsFollowBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!token || isMessageBusy) return;
    setIsMessageBusy(true);
    try {
      const result = await startConversation(token, userId);
      router.push(`/messages?c=${result.conversation.id}`);
    } finally {
      setIsMessageBusy(false);
    }
  };

  const handleSaveBio = async () => {
    if (!token) return;
    setIsSavingBio(true);
    try {
      const result = await updateProfile(token, { bio: bioDraft });
      setProfile((prev) => (prev ? { ...prev, bio: result.profile.bio } : prev));
      setIsEditingBio(false);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadImage(token, file);
      const result = await updateProfile(token, { avatar: uploaded.url });
      setProfile((prev) => (prev ? { ...prev, avatar: result.profile.avatar } : prev));
    } catch {
      // best-effort
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePostUpdate = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6 md:p-stack-lg">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary text-2xl font-semibold text-on-primary">
            {profile.avatar ? (
              <Image src={profile.avatar} alt={profile.name} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
            {profile.isOwnProfile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Change avatar"
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100"
              >
                <span className="material-symbols-outlined">
                  {isUploadingAvatar ? "hourglass_empty" : "photo_camera"}
                </span>
              </button>
            )}
          </div>
          {profile.isOwnProfile && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          )}

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
                  {profile.name}
                </h1>
                <div className="mt-1 flex justify-center gap-4 font-body-sm text-body-sm text-on-surface-variant sm:justify-start">
                  <span>{profile.postCount} posts</span>
                  <span>{profile.followerCount} followers</span>
                  <span>{profile.followingCount} following</span>
                </div>
              </div>
              {!profile.isOwnProfile && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={isMessageBusy}
                    className="rounded-full border border-surface-variant px-5 py-2 font-button text-button text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                  >
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={handleFollow}
                    disabled={isFollowBusy}
                    className={`rounded-full px-6 py-2 font-button text-button transition-colors disabled:opacity-50 ${
                      profile.isFollowedByMe
                        ? "border border-surface-variant text-on-surface hover:border-error hover:text-error"
                        : "bg-primary text-on-primary hover:bg-primary/90"
                    }`}
                  >
                    {profile.isFollowedByMe ? "Following" : "Follow"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3">
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    className="w-full resize-none rounded-lg border border-surface-variant bg-surface-container-lowest p-2.5 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none"
                  />
                  <div className="flex justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      disabled={isSavingBio}
                      className="rounded-lg bg-primary px-4 py-1.5 font-button text-button text-on-primary disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBio(false);
                        setBioDraft(profile.bio);
                      }}
                      className="rounded-lg border border-surface-variant px-4 py-1.5 font-button text-button text-on-surface-variant"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {profile.bio || (profile.isOwnProfile ? "Add a bio to tell other travelers about yourself." : "")}
                  {profile.isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(true)}
                      className="ml-2 text-primary hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </p>
              )}
            </div>

            {profile.countriesVisited.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Countries visited ({profile.countriesVisited.length})
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {profile.countriesVisited.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-outline-variant px-3 py-1 font-body-sm text-body-sm text-on-surface"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-stack-lg">
        <h2 className="mb-stack-md font-headline-md text-headline-md text-on-surface">
          Posts
        </h2>
        {posts.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No posts yet.
          </p>
        ) : (
          <div className="flex flex-col gap-gutter">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={handlePostUpdate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
