"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { ApiError, createPost, uploadImage } from "@/lib/api";
import type { TravelType } from "@/types";

const inputClass =
  "w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelClass =
  "mb-1.5 flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-on-surface-variant";

const POST_TYPES: { key: "story" | "review" | "question"; label: string; icon: string }[] = [
  { key: "story", label: "Story", icon: "auto_stories" },
  { key: "review", label: "Review", icon: "reviews" },
  { key: "question", label: "Question", icon: "help" },
];

const TRAVEL_TYPES: TravelType[] = ["solo", "family", "couple", "friends"];

export default function NewPostPage() {
  const { isReady } = useRequireAuth();
  const { token } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<"story" | "review" | "question">("story");
  const [content, setContent] = useState("");
  const [destination, setDestination] = useState("");
  const [travelType, setTravelType] = useState<TravelType | "">("");
  const [visitedDate, setVisitedDate] = useState("");
  const [rating, setRating] = useState(5);
  const [budget, setBudget] = useState("");
  const [bestTimeToVisit, setBestTimeToVisit] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReady) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    if (images.length >= 4) {
      setUploadError("You can attach up to 4 images.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const result = await uploadImage(token, file);
      setImages((prev) => [...prev, result.url]);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createPost(token, {
        type,
        content,
        images,
        destination: destination || undefined,
        travelType: travelType || undefined,
        visitedDate: visitedDate || undefined,
        rating: type === "review" ? rating : undefined,
        review:
          type === "review"
            ? {
                budget: budget ? Number(budget) : undefined,
                bestTimeToVisit: bestTimeToVisit || undefined,
                pros: pros
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
                cons: cons
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean),
              }
            : undefined,
      });

      router.push(`/community/posts/${result.post._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create post.");
    } finally {
      setIsSubmitting(false);
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

      <div className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6 md:p-stack-lg">
        <h1 className="mb-stack-lg font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Share with the community
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>Post type</label>
            <div className="flex gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-body-sm text-body-sm transition-colors ${
                    type === t.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-surface-variant text-on-surface-variant hover:border-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <span className="material-symbols-outlined text-lg">
                {type === "question" ? "help" : "edit_note"}
              </span>
              {type === "question" ? "Your question" : "Content"}
            </label>
            <textarea
              required
              rows={4}
              placeholder={
                type === "question"
                  ? "What do you want to ask fellow travelers?"
                  : "Share your experience..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="material-symbols-outlined text-lg">location_on</span>
              Destination
            </label>
            <input
              type="text"
              placeholder="Nepal"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={inputClass}
            />
          </div>

          {type === "review" && (
            <>
              <div>
                <label className={labelClass}>
                  <span className="material-symbols-outlined text-lg">star</span>
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="text-secondary"
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: `'FILL' ${n <= rating ? 1 : 0}` }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <span className="material-symbols-outlined text-lg">payments</span>
                    Budget (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="1500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                    Best time to visit
                  </label>
                  <input
                    type="text"
                    placeholder="October - March"
                    value={bestTimeToVisit}
                    onChange={(e) => setBestTimeToVisit(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Pros (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Friendly locals, Cheap food"
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Cons (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Crowded in peak season"
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                <span className="material-symbols-outlined text-lg">group</span>
                Travel type
              </label>
              <select
                value={travelType}
                onChange={(e) => setTravelType(e.target.value as TravelType | "")}
                className={inputClass}
              >
                <option value="">Not specified</option>
                {TRAVEL_TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {tt.charAt(0).toUpperCase() + tt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                <span className="material-symbols-outlined text-lg">event</span>
                Visited date
              </label>
              <input
                type="date"
                value={visitedDate}
                onChange={(e) => setVisitedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <span className="material-symbols-outlined text-lg">image</span>
              Photos ({images.length}/4)
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-variant">
                  <Image src={url} alt="" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">
                    {isUploading ? "hourglass_empty" : "add_photo_alternate"}
                  </span>
                  <span className="font-label-caps text-label-caps">
                    {isUploading ? "Uploading" : "Add"}
                  </span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadError && (
              <p className="mt-2 font-body-sm text-body-sm text-error">{uploadError}</p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-error">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
