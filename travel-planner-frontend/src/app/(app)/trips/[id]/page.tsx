"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import {
  ApiError,
  deleteTrip,
  generateItinerary,
  getTrip,
  regenerateItinerary,
  searchHotels,
  searchRestaurants,
  shareItineraryToCommunity,
  updateTrip,
} from "@/lib/api";
import { AirlineLogo } from "@/components/AirlineLogo";
import { FlightFields } from "@/components/FlightFields";
import type {
  HotelSearchResult,
  RestaurantSearchResult,
  Trip,
  TripFlight,
  TripHotel,
  TripStatus,
} from "@/types";

const inputClass =
  "w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelClass =
  "mb-1.5 flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-on-surface-variant";

const STATUS_META: Record<
  TripStatus,
  { label: string; icon: string; chip: string }
> = {
  planning: {
    label: "Planning",
    icon: "edit_calendar",
    chip: "border-primary/20 bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    icon: "check_circle",
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: "cancel",
    chip: "border-error/20 bg-error/10 text-error",
  },
};

const STATUS_ORDER: TripStatus[] = ["planning", "completed", "cancelled"];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(dateString?: string | null) {
  return dateString ? dateString.slice(0, 10) : "";
}

function toDateTimeInputValue(dateString?: string | null) {
  return dateString ? dateString.slice(0, 16) : "";
}

const emptyHotelForm = {
  name: "",
  address: "",
  checkIn: "",
  checkOut: "",
  price: "",
  currency: "USD",
  confirmationNumber: "",
};

const emptyFlightForm = {
  airline: "",
  airlineCode: "",
  flightNumber: "",
  departureAirport: "",
  arrivalAirport: "",
  departureTime: "",
  arrivalTime: "",
  confirmationNumber: "",
};

function TripDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") === "itinerary" ? "itinerary" : "details";
  const goToTab = (tab: "details" | "itinerary") =>
    router.replace(`/trips/${id}?tab=${tab}`);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    destination: "",
    budget: "",
    travelers: "",
    startDate: "",
    endDate: "",
    interests: "",
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  // Hotel
  const [hotelMode, setHotelMode] = useState<"view" | "manual" | "search">("view");
  const [hotelForm, setHotelForm] = useState(emptyHotelForm);
  const [isSavingHotel, setIsSavingHotel] = useState(false);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [hotelResults, setHotelResults] = useState<HotelSearchResult[]>([]);
  const [hotelResultsSource, setHotelResultsSource] = useState<"live" | "ai" | null>(null);
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState<string | null>(null);

  // Restaurants
  const [restaurantResults, setRestaurantResults] = useState<RestaurantSearchResult[]>([]);
  const [restaurantResultsSource, setRestaurantResultsSource] = useState<"live" | "ai" | null>(
    null
  );
  const [isSearchingRestaurants, setIsSearchingRestaurants] = useState(false);
  const [hasSearchedRestaurants, setHasSearchedRestaurants] = useState(false);
  const [restaurantSearchError, setRestaurantSearchError] = useState<string | null>(null);

  // Flights (an array so round-trip/multi-city itineraries can hold more
  // than one leg)
  const [isEditingFlight, setIsEditingFlight] = useState(false);
  const [flightForms, setFlightForms] = useState([emptyFlightForm]);
  const [isSavingFlight, setIsSavingFlight] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);

  const updateFlightLeg = (index: number, next: typeof emptyFlightForm) => {
    setFlightForms((current) => current.map((leg, i) => (i === index ? next : leg)));
  };

  const addFlightLeg = () => {
    setFlightForms((current) => [...current, emptyFlightForm]);
  };

  const removeFlightLeg = (index: number) => {
    setFlightForms((current) => current.filter((_, i) => i !== index));
  };

  const scope = usePageEntrance<HTMLDivElement>([
    isLoading,
    isEditing,
    isGenerating,
    trip?.itinerary,
    activeTab,
  ]);

  const loadTrip = () => {
    if (!token) return;

    setIsLoading(true);
    getTrip(token, id)
      .then((res) => {
        setTrip(res.trip);
        setEditForm({
          destination: res.trip.destination,
          budget: String(res.trip.budget),
          travelers: String(res.trip.travelers),
          startDate: toDateInputValue(res.trip.startDate),
          endDate: toDateInputValue(res.trip.endDate),
          interests: res.trip.interests.join(", "),
        });
        setHotelForm({
          name: res.trip.hotel?.name || "",
          address: res.trip.hotel?.address || "",
          checkIn: toDateInputValue(res.trip.hotel?.checkIn),
          checkOut: toDateInputValue(res.trip.hotel?.checkOut),
          price: res.trip.hotel?.price != null ? String(res.trip.hotel.price) : "",
          currency: res.trip.hotel?.currency || "USD",
          confirmationNumber: res.trip.hotel?.confirmationNumber || "",
        });
        setFlightForms(
          res.trip.flights.length > 0
            ? res.trip.flights.map((f) => ({
                airline: f.airline || "",
                airlineCode: f.airlineCode || "",
                flightNumber: f.flightNumber || "",
                departureAirport: f.departureAirport || "",
                arrivalAirport: f.arrivalAirport || "",
                departureTime: toDateTimeInputValue(f.departureTime),
                arrivalTime: toDateTimeInputValue(f.arrivalTime),
                confirmationNumber: f.confirmationNumber || "",
              }))
            : [emptyFlightForm]
        );
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load trip.")
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isReady || !token) return;
    // Kicking off a fetch on mount/param change — setIsLoading(true) runs
    // synchronously, the rest resolves async via the fetch promise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, token, id]);

  const handleGenerate = async () => {
    if (!token) return;

    setGenerateError(null);
    setIsGenerating(true);

    try {
      const hasItinerary = !!trip?.itinerary;
      const result = hasItinerary
        ? await regenerateItinerary(token, id)
        : await generateItinerary(token, id);

      setTrip((prev) =>
        prev
          ? {
              ...prev,
              itinerary: result.itinerary,
              itineraryGrounded: result.grounded,
            }
          : prev
      );
    } catch (err) {
      setGenerateError(
        err instanceof ApiError ? err.message : "Could not generate itinerary."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Lets the "Regenerate AI Plan" dashboard quick action land here and kick
  // off generation immediately, instead of just opening the tab and making
  // the user click again. Guarded by a ref (not state) so it fires exactly
  // once per navigation even though handleGenerate's own state updates
  // re-render this component.
  const hasAutoGeneratedRef = useRef(false);
  useEffect(() => {
    if (!trip || hasAutoGeneratedRef.current) return;
    if (searchParams.get("autogenerate") !== "1") return;

    hasAutoGeneratedRef.current = true;
    router.replace(`/trips/${id}?tab=itinerary`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  if (!isReady) return null;

  const handleEditSubmit = async () => {
    if (!token) return;

    setEditError(null);
    setIsSaving(true);

    try {
      const result = await updateTrip(token, id, {
        destination: editForm.destination,
        budget: Number(editForm.budget),
        travelers: Number(editForm.travelers),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        interests: editForm.interests
          .split(",")
          .map((interest) => interest.trim())
          .filter(Boolean),
      });

      setTrip(result.trip);
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not update trip.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: TripStatus) => {
    if (!token || status === trip?.status) return;

    // Cancelling can't be undone, so make the user confirm it the same way
    // deleting does.
    if (
      status === "cancelled" &&
      !confirm(
        "Are you sure you want to cancel this trip? This cannot be undone — a cancelled trip can't be set back to planning or completed."
      )
    ) {
      return;
    }

    setStatusError(null);
    setIsSavingStatus(true);

    try {
      const result = await updateTrip(token, id, { status });
      setTrip(result.trip);
    } catch (err) {
      setStatusError(
        err instanceof ApiError ? err.message : "Could not update trip status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleShare = async () => {
    if (!token) return;

    setShareError(null);
    setIsSharing(true);

    try {
      const result = await shareItineraryToCommunity(token, id);
      setSharedPostId(result.post._id);
    } catch (err) {
      setShareError(err instanceof ApiError ? err.message : "Could not share itinerary.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (!confirm("Delete this trip? This cannot be undone.")) return;

    setIsDeleting(true);

    try {
      await deleteTrip(token, id);
      router.push("/trips");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete trip.");
      setIsDeleting(false);
    }
  };

  const saveHotel = async (hotel: TripHotel | null) => {
    if (!token) return;

    setHotelError(null);
    setIsSavingHotel(true);

    try {
      const result = await updateTrip(token, id, { hotel });
      setTrip(result.trip);
      setHotelMode("view");
    } catch (err) {
      setHotelError(err instanceof ApiError ? err.message : "Could not save hotel.");
    } finally {
      setIsSavingHotel(false);
    }
  };

  const handleHotelFormSubmit = () =>
    saveHotel({
      name: hotelForm.name,
      address: hotelForm.address || undefined,
      checkIn: hotelForm.checkIn || undefined,
      checkOut: hotelForm.checkOut || undefined,
      price: hotelForm.price ? Number(hotelForm.price) : undefined,
      currency: hotelForm.currency || undefined,
      confirmationNumber: hotelForm.confirmationNumber || undefined,
    });

  const handleSelectSearchResult = (result: HotelSearchResult) =>
    saveHotel({
      name: result.hotelName,
      address: result.area ?? undefined,
      checkIn: result.checkInDate,
      checkOut: result.checkOutDate,
      price: result.price ?? undefined,
      currency: result.currency,
      photoUrl: result.photoUrl ?? undefined,
    });

  const handleSearchHotels = async () => {
    if (!token || !trip) return;

    setHotelMode("search");
    setHotelSearchError(null);
    setIsSearchingHotels(true);
    setHotelResults([]);

    try {
      const result = await searchHotels(
        token,
        trip.destination,
        toDateInputValue(trip.startDate),
        toDateInputValue(trip.endDate),
        trip.travelers
      );
      setHotelResults(result.hotels);
      setHotelResultsSource(result.source);
    } catch (err) {
      setHotelSearchError(
        err instanceof ApiError ? err.message : "Could not search hotels."
      );
    } finally {
      setIsSearchingHotels(false);
    }
  };

  const handleSearchRestaurants = async () => {
    if (!token || !trip) return;

    setRestaurantSearchError(null);
    setIsSearchingRestaurants(true);
    setRestaurantResults([]);

    try {
      const result = await searchRestaurants(token, trip.destination);
      setRestaurantResults(result.restaurants);
      setRestaurantResultsSource(result.source);
    } catch (err) {
      setRestaurantSearchError(
        err instanceof ApiError ? err.message : "Could not search restaurants."
      );
    } finally {
      setHasSearchedRestaurants(true);
      setIsSearchingRestaurants(false);
    }
  };

  const handleFlightFormSubmit = async () => {
    if (!token) return;

    setFlightError(null);
    setIsSavingFlight(true);

    try {
      const flights: TripFlight[] = flightForms
        .filter((leg) => leg.airline || leg.flightNumber)
        .map((leg) => ({
          airline: leg.airline || undefined,
          airlineCode: leg.airlineCode || undefined,
          flightNumber: leg.flightNumber || undefined,
          departureAirport: leg.departureAirport || undefined,
          arrivalAirport: leg.arrivalAirport || undefined,
          departureTime: leg.departureTime || undefined,
          arrivalTime: leg.arrivalTime || undefined,
          confirmationNumber: leg.confirmationNumber || undefined,
        }));

      const result = await updateTrip(token, id, { flights });
      setTrip(result.trip);
      setIsEditingFlight(false);
    } catch (err) {
      setFlightError(err instanceof ApiError ? err.message : "Could not save flight.");
    } finally {
      setIsSavingFlight(false);
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading trip...</p>;
  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!trip) return null;

  const hasHotel = !!trip.hotel?.name;
  const hasFlight = trip.flights.length > 0;
  const isCancelled = trip.status === "cancelled";

  return (
    <div ref={scope} className="mx-auto max-w-3xl space-y-stack-md">
      {/* Tabs */}
      <div data-animate className="flex gap-2 border-b border-surface-variant">
        <button
          type="button"
          onClick={() => goToTab("details")}
          className={`px-4 py-2.5 font-button text-button transition-colors ${
            activeTab === "details"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => goToTab("itinerary")}
          className={`px-4 py-2.5 font-button text-button transition-colors ${
            activeTab === "itinerary"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          View Itinerary
        </button>
      </div>

      {activeTab === "details" && (
        <>
          {/* Trip info */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            {!isEditing ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface">
                      {trip.destination}
                    </h1>
                    <span
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 font-label-caps text-label-caps ${STATUS_META[trip.status].chip}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {STATUS_META[trip.status].icon}
                      </span>
                      {STATUS_META[trip.status].label}
                    </span>
                  </div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    {formatDate(trip.startDate)} - {formatDate(trip.endDate)} ·{" "}
                    {trip.travelers} traveler{trip.travelers > 1 ? "s" : ""} ·{" "}
                    ${trip.budget.toLocaleString()}
                  </p>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    Traveler: {user?.name ?? "—"}
                  </p>
                  {trip.interests.length > 0 && (
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                      Interests: {trip.interests.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg border border-surface-variant px-3 py-1.5 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg border border-error/50 px-3 py-1.5 font-button text-button text-error transition-colors hover:bg-error/5 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Destination</label>
                  <input
                    type="text"
                    value={editForm.destination}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, destination: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Start date</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, startDate: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>End date</label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, endDate: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Budget (USD)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.budget}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, budget: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Travelers</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.travelers}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, travelers: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Interests (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.interests}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, interests: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>

                {editError && (
                  <p className="font-body-sm text-body-sm text-error">{editError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleEditSubmit}
                    disabled={isSaving}
                    className="rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-surface-variant px-4 py-2 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trip status */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <h2 className="mb-1 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <span className="material-symbols-outlined text-primary">flag</span>
              Trip status
            </h2>
            <p className="mb-stack-md font-body-sm text-body-sm text-on-surface-variant">
              {isCancelled
                ? "This trip was cancelled. Cancelling is permanent, so it can't be set back to planning or completed."
                : "Trips complete themselves once the end date has passed. Mark this one early if you're already back, or cancel it if the plan fell through — cancelling can't be undone."}
            </p>

            {statusError && (
              <p className="mb-stack-sm font-body-sm text-body-sm text-error">
                {statusError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => {
                const meta = STATUS_META[status];
                const isCurrent = trip.status === status;
                // Once cancelled, nothing else is selectable.
                const isLocked = isCancelled && !isCurrent;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    disabled={isSavingStatus || isCurrent || isLocked}
                    title={
                      isLocked ? "A cancelled trip can't be reopened." : undefined
                    }
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-button text-button transition-colors disabled:cursor-not-allowed ${
                      isCurrent
                        ? `${meta.chip} disabled:cursor-default`
                        : "border-surface-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-surface-variant disabled:hover:text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isLocked ? "lock" : meta.icon}
                    </span>
                    {meta.label}
                    {isCurrent && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hotel */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-stack-md flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
                <span className="material-symbols-outlined text-primary">hotel</span>
                Hotel
              </h2>
              {hotelMode === "view" && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSearchHotels}
                    className="rounded-lg border border-primary px-3 py-1.5 font-button text-button text-primary transition-colors hover:bg-primary/5"
                  >
                    Search hotels
                  </button>
                  <button
                    onClick={() => setHotelMode("manual")}
                    className="rounded-lg border border-surface-variant px-3 py-1.5 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
                  >
                    {hasHotel ? "Edit" : "Enter manually"}
                  </button>
                </div>
              )}
              {hotelMode !== "view" && (
                <button
                  onClick={() => {
                    setHotelMode("view");
                    setHotelResults([]);
                  }}
                  className="font-button text-button text-on-surface-variant hover:text-primary"
                >
                  Cancel
                </button>
              )}
            </div>

            {hotelError && (
              <p className="mb-stack-sm font-body-sm text-body-sm text-error">
                {hotelError}
              </p>
            )}

            {hotelMode === "view" &&
              (hasHotel ? (
                <div className="flex items-start gap-4">
                  {trip.hotel?.photoUrl && (
                    <Image
                      src={trip.hotel.photoUrl}
                      alt={trip.hotel.name || "Hotel"}
                      width={80}
                      height={80}
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="font-body-md font-semibold text-body-md text-on-surface">
                      {trip.hotel?.name}
                    </p>
                    {trip.hotel?.address && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {trip.hotel.address}
                      </p>
                    )}
                    {(trip.hotel?.checkIn || trip.hotel?.checkOut) && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {trip.hotel?.checkIn ? formatDate(trip.hotel.checkIn) : "—"} -{" "}
                        {trip.hotel?.checkOut ? formatDate(trip.hotel.checkOut) : "—"}
                      </p>
                    )}
                    {trip.hotel?.price != null && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {trip.hotel.currency} {trip.hotel.price}
                      </p>
                    )}
                    {trip.hotel?.confirmationNumber && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Confirmation: {trip.hotel.confirmationNumber}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No hotel added yet.
                </p>
              ))}

            {hotelMode === "search" && (
              <div className="space-y-3">
                {isSearchingHotels && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Searching real hotel availability for {trip.destination}...
                  </p>
                )}
                {!isSearchingHotels && hotelResultsSource === "ai" && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-surface-container p-2.5 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-lg text-primary">
                      auto_awesome
                    </span>
                    Live pricing is temporarily unavailable, so these are
                    AI-suggested places to stay — verify details before booking.
                  </p>
                )}
                {hotelSearchError && (
                  <p className="font-body-sm text-body-sm text-error">
                    {hotelSearchError}
                  </p>
                )}
                {!isSearchingHotels && hotelResults.length === 0 && !hotelSearchError && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    No hotels found.
                  </p>
                )}
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {hotelResults.map((hotel, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg border border-surface-variant p-3"
                    >
                      {hotel.photoUrl ? (
                        <Image
                          src={hotel.photoUrl}
                          alt={hotel.hotelName}
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        hotel.reason && (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-tertiary/15">
                            <span className="material-symbols-outlined text-2xl text-primary">
                              hotel
                            </span>
                          </div>
                        )
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-sm font-semibold text-body-sm text-on-surface">
                          {hotel.hotelName}
                          {hotel.stars && hotel.stars > 0 ? (
                            <span
                              className="ml-1 text-primary"
                              aria-label={`${hotel.stars} star hotel`}
                            >
                              {"★".repeat(Math.min(5, Math.round(hotel.stars)))}
                            </span>
                          ) : null}
                        </p>
                        {hotel.reason ? (
                          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                            {[
                              hotel.rating != null
                                ? `${hotel.ratingIsEstimate ? "~" : ""}${hotel.rating}/10`
                                : null,
                              hotel.area,
                              hotel.priceTier,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            {" — "}
                            {hotel.reason}
                          </p>
                        ) : (
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {hotel.rating != null ? `${hotel.rating}/10` : "No rating"}
                            {hotel.reviewCount != null ? ` (${hotel.reviewCount})` : ""} ·{" "}
                            {hotel.price != null
                              ? `${hotel.currency} ${hotel.price}`
                              : "Price unavailable"}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectSearchResult(hotel)}
                        disabled={isSavingHotel}
                        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hotelMode === "manual" && (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Hotel name</label>
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, address: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Check-in</label>
                    <input
                      type="date"
                      value={hotelForm.checkIn}
                      onChange={(e) =>
                        setHotelForm((f) => ({ ...f, checkIn: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Check-out</label>
                    <input
                      type="date"
                      value={hotelForm.checkOut}
                      onChange={(e) =>
                        setHotelForm((f) => ({ ...f, checkOut: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Price</label>
                    <input
                      type="number"
                      min={0}
                      value={hotelForm.price}
                      onChange={(e) =>
                        setHotelForm((f) => ({ ...f, price: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <input
                      type="text"
                      value={hotelForm.currency}
                      onChange={(e) =>
                        setHotelForm((f) => ({ ...f, currency: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirmation number</label>
                  <input
                    type="text"
                    value={hotelForm.confirmationNumber}
                    onChange={(e) =>
                      setHotelForm((f) => ({ ...f, confirmationNumber: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={handleHotelFormSubmit}
                  disabled={isSavingHotel || !hotelForm.name}
                  className="rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSavingHotel ? "Saving..." : "Save hotel"}
                </button>
              </div>
            )}
          </div>

          {/* Restaurants */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-stack-md flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
                <span className="material-symbols-outlined text-primary">
                  restaurant
                </span>
                Restaurants
              </h2>
              <button
                type="button"
                onClick={handleSearchRestaurants}
                disabled={isSearchingRestaurants}
                className="rounded-lg border border-surface-variant px-3 py-1.5 font-button text-button text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                {hasSearchedRestaurants ? "Refresh" : "Find top restaurants"}
              </button>
            </div>

            {isSearchingRestaurants && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Finding top restaurants in {trip.destination}...
              </p>
            )}

            {!isSearchingRestaurants && restaurantResultsSource === "ai" && (
              <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-surface-container p-2.5 font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-lg text-primary">
                  auto_awesome
                </span>
                Live restaurant data is temporarily unavailable, so these are
                AI-suggested spots — verify details before visiting.
              </p>
            )}

            {restaurantSearchError && (
              <p className="font-body-sm text-body-sm text-error">
                {restaurantSearchError}
              </p>
            )}

            {!isSearchingRestaurants &&
              hasSearchedRestaurants &&
              restaurantResults.length === 0 &&
              !restaurantSearchError && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No restaurants found.
                </p>
              )}

            {!hasSearchedRestaurants && !isSearchingRestaurants && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Discover the top-rated restaurants in {trip.destination}.
              </p>
            )}

            {restaurantResults.length > 0 && (
              <ul className="max-h-96 space-y-2 overflow-y-auto">
                {restaurantResults.map((restaurant, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-surface-variant p-3"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-tertiary/15">
                      <span className="material-symbols-outlined text-2xl text-primary">
                        restaurant
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-body-sm font-semibold text-body-sm text-on-surface">
                          {restaurant.name}
                        </p>
                        {restaurant.rating != null && (
                          <span className="shrink-0 font-body-sm text-body-sm text-on-surface-variant">
                            {restaurant.ratingIsEstimate ? "~" : ""}
                            {restaurant.rating}/5
                            {restaurant.priceTier ? ` · ${restaurant.priceTier}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                        {[
                          restaurant.categories.join(", "),
                          restaurant.address || restaurant.area,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {restaurant.reason && (
                        <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                          {restaurant.reason}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Flight */}
          <div
            data-animate
            className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-stack-md flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
                <span className="material-symbols-outlined text-primary">flight</span>
                Flight
              </h2>
              {!isEditingFlight && (
                <button
                  onClick={() => setIsEditingFlight(true)}
                  className="rounded-lg border border-surface-variant px-3 py-1.5 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
                >
                  {hasFlight ? "Edit" : "Enter flight details"}
                </button>
              )}
              {isEditingFlight && (
                <button
                  onClick={() => setIsEditingFlight(false)}
                  className="font-button text-button text-on-surface-variant hover:text-primary"
                >
                  Cancel
                </button>
              )}
            </div>

            {flightError && (
              <p className="mb-stack-sm font-body-sm text-body-sm text-error">
                {flightError}
              </p>
            )}

            {!isEditingFlight &&
              (hasFlight ? (
                <div className="space-y-4">
                  {trip.flights.map((flight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 border-b border-surface-variant/50 pb-4 last:border-0 last:pb-0"
                    >
                      <AirlineLogo
                        code={flight.airlineCode}
                        alt={flight.airline || "Airline"}
                        size={40}
                        className="shrink-0 rounded object-contain"
                      />
                      <div>
                        <p className="font-body-md font-semibold text-body-md text-on-surface">
                          {flight.airline} {flight.flightNumber}
                        </p>
                        {(flight.departureAirport || flight.arrivalAirport) && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {flight.departureAirport || "—"} →{" "}
                            {flight.arrivalAirport || "—"}
                          </p>
                        )}
                        {(flight.departureTime || flight.arrivalTime) && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {flight.departureTime
                              ? new Date(flight.departureTime).toLocaleString()
                              : "—"}{" "}
                            -{" "}
                            {flight.arrivalTime
                              ? new Date(flight.arrivalTime).toLocaleString()
                              : "—"}
                          </p>
                        )}
                        {flight.confirmationNumber && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Confirmation: {flight.confirmationNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No flight added yet.
                </p>
              ))}

            {isEditingFlight && (
              <div className="space-y-4">
                {flightForms.map((leg, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-surface-variant p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-body-sm font-semibold text-body-sm text-on-surface">
                        Flight {index + 1}
                      </p>
                      {flightForms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFlightLeg(index)}
                          className="flex items-center gap-1 font-body-sm text-body-sm text-error hover:underline"
                        >
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                          Remove
                        </button>
                      )}
                    </div>
                    <FlightFields
                      value={leg}
                      onChange={(next) => updateFlightLeg(index, next)}
                    />
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addFlightLeg}
                    className="flex items-center gap-1.5 font-button text-button text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add another flight
                  </button>
                  <button
                    onClick={handleFlightFormSubmit}
                    disabled={isSavingFlight}
                    className="rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSavingFlight ? "Saving..." : "Save flights"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "itinerary" && (
        <div
          data-animate
          className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6"
        >
          <div className="mb-stack-md flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Itinerary
            </h2>
            <div className="flex gap-2">
              {trip.itinerary && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="rounded-lg border border-surface-variant px-4 py-2 font-button text-button text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                >
                  {isSharing ? "Sharing..." : "Share to Community"}
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rounded-lg bg-primary px-4 py-2 font-button text-button text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isGenerating
                  ? "Generating..."
                  : trip.itinerary
                    ? "Regenerate itinerary"
                    : "Generate itinerary"}
              </button>
            </div>
          </div>

          {shareError && (
            <p className="mb-stack-md font-body-sm text-body-sm text-error">
              {shareError}
            </p>
          )}
          {sharedPostId && (
            <p className="mb-stack-md font-body-sm text-body-sm text-primary">
              Shared!{" "}
              <Link href={`/community/posts/${sharedPostId}`} className="underline">
                View it on Community
              </Link>
            </p>
          )}

          {generateError && (
            <p className="mb-stack-md font-body-sm text-body-sm text-error">
              {generateError}
            </p>
          )}

          {!trip.itinerary && !isGenerating && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No itinerary yet. Click &ldquo;Generate itinerary&rdquo; to create one.
            </p>
          )}

          {isGenerating && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Building your itinerary — this can take up to a minute...
            </p>
          )}

          {trip.itinerary && !isGenerating && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-body-md text-body-md text-on-surface">
                  {trip.itinerary.summary}
                </p>
                {trip.itineraryGrounded !== null && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 font-label-caps text-label-caps ${
                      trip.itineraryGrounded
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-800"
                    }`}
                    title={
                      trip.itineraryGrounded
                        ? "Backed by real travel guide sources"
                        : "No travel guide covers this destination — based on general AI knowledge, not verified sources"
                    }
                  >
                    {trip.itineraryGrounded
                      ? "Grounded in sources"
                      : "Ungrounded (AI general knowledge)"}
                  </span>
                )}
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Estimated budget: {trip.itinerary.totalEstimatedBudget}{" "}
                {trip.itinerary.currency}
              </p>

              {trip.itinerary.travelTips.length > 0 && (
                <div>
                  <h3 className="mb-1 font-headline-sm text-headline-sm text-on-surface">
                    Travel tips
                  </h3>
                  <ul className="list-inside list-disc font-body-sm text-body-sm text-on-surface-variant">
                    {trip.itinerary.travelTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {trip.itinerary.days.map((day) => (
                  <div
                    key={day.day}
                    data-animate
                    className="rounded-lg border border-surface-variant p-4"
                  >
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      Day {day.day} — {day.city}
                    </h3>
                    <p className="mb-2 font-label-caps text-label-caps text-on-surface-variant">
                      {day.theme}
                    </p>
                    <ul className="space-y-2">
                      {day.activities.map((activity, i) => (
                        <li key={i} className="font-body-sm text-body-sm">
                          <span className="font-semibold text-on-surface">
                            {activity.time} — {activity.title}
                          </span>
                          <p className="text-on-surface-variant">
                            {activity.description}
                          </p>
                          <p className="font-label-caps text-label-caps text-on-surface-variant">
                            Est. cost: {activity.estimatedCost}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <TripDetailContent params={params} />
    </Suspense>
  );
}
