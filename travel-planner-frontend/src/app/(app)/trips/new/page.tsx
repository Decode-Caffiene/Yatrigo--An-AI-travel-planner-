"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { usePageEntrance } from "@/lib/usePageEntrance";
import { createTrip, searchHotels, searchPlaces, ApiError } from "@/lib/api";
import { searchDestinations } from "@/lib/destinations";
import type { DestinationSuggestion } from "@/lib/destinations";
import { FlightFields } from "@/components/FlightFields";
import type { HotelSearchResult } from "@/types";

const inputClass =
  "w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelClass =
  "mb-1.5 flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-on-surface-variant";

const INTEREST_OPTIONS = [
  "Nature", "Food", "Culture", "Adventure", "Relaxation", "Nightlife",
  "Shopping", "History", "Wildlife", "Beaches", "Art", "Photography",
  "Family", "Wellness", "Architecture", "Sports",
];

const STEPS = [
  { id: 1, label: "Trip Details" },
  { id: 2, label: "Hotel" },
  { id: 3, label: "Flight" },
] as const;

type Step = 1 | 2 | 3;

const emptyHotelForm = {
  name: "",
  address: "",
  checkIn: "",
  checkOut: "",
  price: "",
  currency: "USD",
  confirmationNumber: "",
  photoUrl: "",
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

function NewTripForm() {
  const { isReady } = useRequireAuth();
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — trip details
  const [destination, setDestination] = useState(
    () => searchParams.get("destination") ?? ""
  );
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [budget, setBudget] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);
  const interestsRef = useRef<HTMLDivElement>(null);
  const [stepOneError, setStepOneError] = useState<string | null>(null);

  const [liveSuggestions, setLiveSuggestions] = useState<DestinationSuggestion[]>([]);

  // Step 2 — hotel
  const [hotelForm, setHotelForm] = useState(emptyHotelForm);
  const [hotelResults, setHotelResults] = useState<HotelSearchResult[]>([]);
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState<string | null>(null);
  const [selectedHotelName, setSelectedHotelName] = useState<string | null>(null);

  // Step 3 — flight
  const [flightForm, setFlightForm] = useState(emptyFlightForm);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scope = usePageEntrance<HTMLDivElement>([step]);

  useEffect(() => {
    const query = destination.trim();

    if (!token || query.length < 3) {
      // Below the live search's useful prefix length — clear rather than
      // show stale results from a previous longer query.
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

    return [...local, ...extra].slice(0, 10);
  }, [destination, liveSuggestions]);

  useEffect(() => {
    if (!isInterestsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!interestsRef.current?.contains(event.target as Node)) {
        setIsInterestsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isInterestsOpen]);

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest]
    );
  };

  if (!isReady) return null;

  const runHotelSearch = async () => {
    if (!token) return;

    setHotelSearchError(null);
    setIsSearchingHotels(true);

    try {
      const result = await searchHotels(
        token,
        destination,
        startDate,
        endDate,
        Number(travelers) || 1
      );
      setHotelResults(result.hotels);
    } catch (err) {
      setHotelSearchError(
        err instanceof ApiError ? err.message : "Could not search hotels."
      );
    } finally {
      setIsSearchingHotels(false);
    }
  };

  const goToHotelStep = () => {
    if (!destination || !startDate || !endDate || !budget) {
      setStepOneError("Please fill in destination, dates, and budget.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setStepOneError("Start date cannot be after end date.");
      return;
    }

    setStepOneError(null);
    setStep(2);
    runHotelSearch();
  };

  const selectHotelResult = (hotel: HotelSearchResult) => {
    setHotelForm({
      name: hotel.hotelName,
      address: "",
      checkIn: hotel.checkInDate,
      checkOut: hotel.checkOutDate,
      price: hotel.price != null ? String(hotel.price) : "",
      currency: hotel.currency,
      confirmationNumber: "",
      photoUrl: hotel.photoUrl || "",
    });
    setSelectedHotelName(hotel.hotelName);
  };

  const handleFinish = async () => {
    if (!token) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createTrip(token, {
        destination,
        budget: Number(budget),
        travelers: Number(travelers),
        startDate,
        endDate,
        interests,
        hotel: hotelForm.name
          ? {
              name: hotelForm.name,
              address: hotelForm.address || undefined,
              checkIn: hotelForm.checkIn || undefined,
              checkOut: hotelForm.checkOut || undefined,
              price: hotelForm.price ? Number(hotelForm.price) : undefined,
              currency: hotelForm.currency || undefined,
              confirmationNumber: hotelForm.confirmationNumber || undefined,
              photoUrl: hotelForm.photoUrl || undefined,
            }
          : null,
        flight:
          flightForm.airline || flightForm.flightNumber
            ? {
                airline: flightForm.airline || undefined,
                airlineCode: flightForm.airlineCode || undefined,
                flightNumber: flightForm.flightNumber || undefined,
                departureAirport: flightForm.departureAirport || undefined,
                arrivalAirport: flightForm.arrivalAirport || undefined,
                departureTime: flightForm.departureTime || undefined,
                arrivalTime: flightForm.arrivalTime || undefined,
                confirmationNumber: flightForm.confirmationNumber || undefined,
              }
            : null,
      });

      router.push(`/trips/${result.trip._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create trip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={scope} className="mx-auto max-w-2xl">
      <Link
        href="/trips"
        data-animate
        className="mb-stack-md inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to trips
      </Link>

      <div
        data-animate
        className="card-shadow rounded-xl border border-surface-variant bg-surface-container-lowest p-6 md:p-stack-lg"
      >
        <div className="mb-stack-lg flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container/20">
            <span className="material-symbols-outlined text-3xl text-primary">
              add_location
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Plan a new trip
            </h1>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Step {step} of 3: {STEPS[step - 1].label}
            </p>
          </div>
        </div>

        <div className="mb-stack-lg h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Trip details */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="relative">
              <label className={labelClass}>
                <span className="material-symbols-outlined text-lg">location_on</span>
                Destination
              </label>
              <input
                type="text"
                required
                placeholder="Nepal"
                autoComplete="off"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => setIsDestinationFocused(true)}
                onBlur={() => setIsDestinationFocused(false)}
                className={inputClass}
              />
              {isDestinationFocused && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg">
                  {suggestions.map((place) => (
                    <li key={place.label}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          // Prevent the input's blur so the click registers
                          // before the dropdown would otherwise disappear.
                          e.preventDefault();
                          setDestination(place.label);
                        }}
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-body-md text-body-md text-on-surface transition-colors hover:bg-primary/10"
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="material-symbols-outlined text-lg">
                    calendar_today
                  </span>
                  Start date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="material-symbols-outlined text-lg">
                    calendar_today
                  </span>
                  End date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
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
                  required
                  min={0}
                  placeholder="2000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="material-symbols-outlined text-lg">group</span>
                  Travelers
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="relative" ref={interestsRef}>
              <label className={labelClass}>
                <span className="material-symbols-outlined text-lg">interests</span>
                Interests
              </label>
              <button
                type="button"
                onClick={() => setIsInterestsOpen((open) => !open)}
                className={`${inputClass} flex min-h-11.5 items-center justify-between gap-2 text-left`}
              >
                {interests.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-label-caps text-label-caps text-primary"
                      >
                        {interest}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-outline-variant">Select interests</span>
                )}
                <span className="material-symbols-outlined shrink-0 text-lg text-on-surface-variant">
                  {isInterestsOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {isInterestsOpen && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg">
                  {INTEREST_OPTIONS.map((interest) => {
                    const isSelected = interests.includes(interest);
                    return (
                      <li key={interest}>
                        <button
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-body-md text-body-md text-on-surface transition-colors hover:bg-primary/10"
                        >
                          <span
                            className={`material-symbols-outlined text-lg ${
                              isSelected ? "text-primary" : "text-outline-variant"
                            }`}
                          >
                            {isSelected ? "check_box" : "check_box_outline_blank"}
                          </span>
                          {interest}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {stepOneError && (
              <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-error">
                <span className="material-symbols-outlined text-lg">error</span>
                {stepOneError}
              </p>
            )}

            <button
              type="button"
              onClick={goToHotelStep}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90"
            >
              Next
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2: Hotel */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="mb-stack-sm flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
                <span className="material-symbols-outlined text-primary">hotel</span>
                Real hotels in {destination}
              </h2>

              {isSearchingHotels && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Searching live availability...
                </p>
              )}
              {hotelSearchError && (
                <p className="font-body-sm text-body-sm text-error">
                  {hotelSearchError}
                </p>
              )}
              {!isSearchingHotels && hotelResults.length === 0 && !hotelSearchError && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No hotels found for these dates.
                </p>
              )}

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {hotelResults.map((hotel, index) => {
                  const isSelected = selectedHotelName === hotel.hotelName;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        isSelected ? "border-primary bg-primary/5" : "border-surface-variant"
                      }`}
                    >
                      {hotel.photoUrl && (
                        <Image
                          src={hotel.photoUrl}
                          alt={hotel.hotelName}
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-sm font-semibold text-body-sm text-on-surface">
                          {hotel.hotelName}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {hotel.rating != null ? `${hotel.rating}/10` : "No rating"}
                          {hotel.reviewCount != null ? ` (${hotel.reviewCount})` : ""} ·{" "}
                          {hotel.price != null
                            ? `${hotel.currency} ${hotel.price}`
                            : "Price unavailable"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectHotelResult(hotel)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 font-button text-button transition-colors ${
                          isSelected
                            ? "bg-primary text-on-primary"
                            : "border border-primary text-primary hover:bg-primary/5"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-surface-variant pt-stack-md">
              <h3 className="mb-stack-sm font-headline-sm text-headline-sm text-on-surface">
                Or enter hotel details manually
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Hotel name</label>
                  <input
                    type="text"
                    value={hotelForm.name}
                    onChange={(e) => {
                      setSelectedHotelName(null);
                      setHotelForm((f) => ({ ...f, name: e.target.value }));
                    }}
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                      setHotelForm((f) => ({
                        ...f,
                        confirmationNumber: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-surface-variant px-4 py-3 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90"
              >
                Next
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Flight */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <span className="material-symbols-outlined text-primary">flight</span>
              Flight details
            </h2>
            <p className="-mt-3 font-body-sm text-body-sm text-on-surface-variant">
              Already booked a flight? Add the details here (optional).
            </p>

            <FlightFields value={flightForm} onChange={setFlightForm} />

            {error && (
              <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-error">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-surface-variant px-4 py-3 font-button text-button text-on-surface transition-colors hover:bg-surface-container"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-button text-button text-on-primary shadow-[0px_4px_12px_rgba(53,37,205,0.2)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Creating..."
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check</span>
                    Finish
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <Suspense fallback={null}>
      <NewTripForm />
    </Suspense>
  );
}
