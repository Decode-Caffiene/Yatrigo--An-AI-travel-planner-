import axios from "axios";

import AppError from "../utils/AppError.js";
import groq from "../utils/groq.js";
import { AI_CONFIG } from "../config/ai.js";
import { getWikipediaArticleImage } from "../utils/wikipedia.js";
import { cached } from "../utils/cache.js";

const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;
const HOTEL_RESULTS_COUNT = 10;
// Live prices genuinely drift, so this is shorter than the events cache —
// long enough to absorb repeat searches for the same trip (viewing a trip
// page, hitting "Refresh", multiple users searching the same popular
// destination/dates) without serving stale pricing for too long.
const HOTEL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Real (not AI-generated) photo for one AI-suggested hotel — an earlier
// attempt using getWikipediaSummary produced wrong photos (a budget hotel
// query resolving to the Burj Al Arab's photo; "Armani Hotel Dubai" and
// "Park Hyatt Tokyo" resolving to an unrelated Vienna storefront and a
// Chicago skyscraper). Both of those came from that function's "search
// Commons by title" fallback for articles with no lead image of their own.
// getWikipediaArticleImage doesn't have that step: it only trusts a direct
// summary lookup or a strictly title-matched search result, so it's more
// likely to return nothing than to return something wrong — a deliberate
// trade of hit-rate for accuracy for something as specific as "this exact
// hotel." A miss just falls back to the placeholder icon in the UI.
const getHotelPhoto = async (hotelName) => {
  if (!hotelName) return null;
  return (await getWikipediaArticleImage(hotelName)) || null;
};

// Highest-rated first, nulls (no rating available) last rather than sorted
// as 0 — both live results (Booking.com occasionally omits reviewScore) and
// the AI fallback rely on this for "top N best" ordering.
const sortByRatingDesc = (hotels) =>
  [...hotels].sort((a, b) => {
    if (a.rating == null && b.rating == null) return 0;
    if (a.rating == null) return 1;
    if (b.rating == null) return -1;
    return b.rating - a.rating;
  });

const requestAIHotelSuggestions = async (destination) => {
  const completion = await groq.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: 0.4,
    // Reasoning models spend part of the output budget on hidden reasoning
    // before writing the final JSON — 10 items needs more headroom than a
    // shorter list did (see the identical truncation issue and fix in
    // event.service.js's global events generator).
    max_completion_tokens: 3500,
    messages: [
      {
        role: "system",
        content:
          "You are a hotel recommendation assistant. Given a travel destination, " +
          `list the ${HOTEL_RESULTS_COUNT} best places to stay there. This must ` +
          "include the destination's most iconic, famous, and highest-rated " +
          "5-star/luxury landmark hotels (the ones a well-traveled local would " +
          "immediately name) if any exist there, plus a spread of well-regarded " +
          "mid-range and budget options — don't limit the list to only luxury or " +
          "only budget. Prefer real, well-known hotel names you're confident " +
          "actually exist; if you're not confident a specific hotel name is " +
          "real, suggest a specific neighborhood/area to stay in instead. " +
          "Order the array from highest to lowest rating. " +
          "Respond with ONLY a raw JSON array (no markdown fences, no " +
          `commentary) of exactly ${HOTEL_RESULTS_COUNT} items, where each item ` +
          'has exactly these fields: "hotelName" (string), "area" (string, the ' +
          'neighborhood or area), "stars" (number, 1-5, the property\'s star ' +
          'class), "priceTier" (string, one of "Budget", "Mid-range", ' +
          '"Luxury"), "rating" (number, your best estimate of a typical guest ' +
          "satisfaction score on a 1-10 scale, one decimal place), \"reason\" " +
          "(string, one short sentence on why).",
      },
      {
        role: "user",
        content: `Destination: ${destination}`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("AI response was not a JSON array.");
  }

  return parsed;
};

/**
 * Falls back to AI-suggested places to stay when the live Booking.com search
 * is unavailable (monthly RapidAPI quota exhausted, or rate-limited) — so a
 * single shared API key running out doesn't block every user from getting
 * any hotel suggestions until the quota resets. Not live inventory/pricing —
 * price and review count stay null rather than fabricated, and photoUrl is
 * only ever a verified Wikipedia image (see getHotelPhoto) or null — never
 * a guessed/mismatched one. The rating is explicitly the model's estimate,
 * not a real aggregated score.
 */
const generateAIHotelSuggestions = async (destination, checkInDate, checkOutDate) => {
  // Reasoning models occasionally emit malformed/unterminated JSON for a
  // longer list regardless of token budget — one retry clears up the vast
  // majority (same pattern as event.service.js's global events generator).
  let parsed;
  try {
    parsed = await requestAIHotelSuggestions(destination);
  } catch {
    parsed = await requestAIHotelSuggestions(destination);
  }

  const photoUrls = await Promise.all(
    parsed.map((item) => getHotelPhoto(String(item.hotelName || "")))
  );

  const hotels = parsed.map((item, index) => ({
    hotelName: String(item.hotelName || "Recommended stay"),
    rating: typeof item.rating === "number" ? item.rating : null,
    ratingIsEstimate: true,
    reviewCount: null,
    stars: typeof item.stars === "number" ? item.stars : null,
    price: null,
    currency: "USD",
    checkInDate,
    checkOutDate,
    photoUrl: photoUrls[index],
    area: item.area || null,
    priceTier: item.priceTier || null,
    reason: item.reason || null,
  }));

  return sortByRatingDesc(hotels);
};

const rapidApiHeaders = () => ({
  "X-RapidAPI-Key": process.env.BOOKING_API_KEY,
  "X-RapidAPI-Host": RAPIDAPI_HOST,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A 429 with the monthly quota exhausted won't recover on retry — surface it
// with the reset date instead of a "try again" message.
const throwIfQuotaExhausted = (error) => {
  const headers = error.response?.headers || {};

  if (headers["x-ratelimit-requests-remaining"] !== "0") return;

  const resetSeconds = Number(headers["x-ratelimit-requests-reset"]);
  const resetsOn = Number.isFinite(resetSeconds)
    ? new Date(Date.now() + resetSeconds * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  throw new AppError(
    `The monthly quota for the hotel search API has been used up${
      resetsOn ? ` (resets on ${resetsOn})` : ""
    }. Please enter your hotel details manually.`,
    429
  );
};

// The free RapidAPI tier also throttles per-second, so the destination lookup
// and the hotel search fired back-to-back can get a 429 — one paced retry
// recovers that case without burning extra quota.
const rapidApiGet = async (url, params) => {
  try {
    return await axios.get(url, { params, headers: rapidApiHeaders() });
  } catch (error) {
    if (error.response?.status !== 429) throw error;

    throwIfQuotaExhausted(error);

    await sleep(1500);
    return axios.get(url, { params, headers: rapidApiHeaders() });
  }
};

// dest_id for a destination string never changes — cache it so each hotel
// search costs one upstream call instead of two.
const destinationCache = new Map();

const resolveDestination = async (destination) => {
  const cacheKey = destination.trim().toLowerCase();
  if (destinationCache.has(cacheKey)) return destinationCache.get(cacheKey);

  const { data } = await rapidApiGet(`${BASE_URL}/api/v1/hotels/searchDestination`, {
    query: destination,
  });

  const match = data.data?.[0];

  if (!match) {
    throw new AppError(`Could not find a Booking.com destination for "${destination}".`, 404);
  }

  const resolved = { destId: match.dest_id, searchType: match.search_type };
  destinationCache.set(cacheKey, resolved);
  return resolved;
};

/**
 * Real Booking.com inventory and live pricing via RapidAPI's booking-com15
 * wrapper (this account is subscribed to that specific host — RapidAPI
 * hosts several similarly-named Booking.com APIs on different hosts, and a
 * key only works for the one(s) actually subscribed to).
 */
const searchHotelsUncached = async (destination, checkInDate, checkOutDate, adults = 1) => {
  if (!process.env.BOOKING_API_KEY) {
    throw new AppError("BOOKING_API_KEY is not configured.", 500);
  }

  try {
    const { destId, searchType } = await resolveDestination(destination);

    const { data } = await rapidApiGet(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      dest_id: destId,
      search_type: searchType,
      arrival_date: checkInDate,
      departure_date: checkOutDate,
      adults,
      room_qty: 1,
      page_number: 1,
      currency_code: "USD",
    });

    const hotels = data.data?.hotels || [];

    const mapped = hotels.map((entry) => ({
      hotelName: entry.property?.name,
      rating: entry.property?.reviewScore ?? null,
      reviewCount: entry.property?.reviewCount ?? null,
      stars: entry.property?.propertyClass ?? null,
      price: entry.property?.priceBreakdown?.grossPrice?.value != null
        ? Number(entry.property.priceBreakdown.grossPrice.value.toFixed(2))
        : null,
      currency: entry.property?.priceBreakdown?.grossPrice?.currency ?? "USD",
      checkInDate: entry.property?.checkinDate,
      checkOutDate: entry.property?.checkoutDate,
      photoUrl: entry.property?.photoUrls?.[0] ?? null,
    }));

    return {
      source: "live",
      hotels: sortByRatingDesc(mapped).slice(0, HOTEL_RESULTS_COUNT),
    };
  } catch (error) {
    const isRateLimited =
      (error instanceof AppError && error.statusCode === 429) ||
      error.response?.status === 429;

    if (!isRateLimited) {
      if (error instanceof AppError) throw error;

      console.error(error.response?.data || error.message);
      throw new AppError(`Could not fetch hotel offers for "${destination}".`, 502);
    }

    // Live search is unavailable (monthly quota exhausted or throttled) —
    // fall back to AI-suggested places to stay instead of hard-failing
    // every user until the external API's quota resets.
    try {
      const hotels = await generateAIHotelSuggestions(destination, checkInDate, checkOutDate);
      return { source: "ai", hotels };
    } catch (fallbackError) {
      console.error("AI hotel fallback failed:", fallbackError.message);

      if (error instanceof AppError) throw error;

      throw new AppError(
        "Hotel search is rate-limited right now. Please wait a moment and try again, or enter your hotel details manually.",
        429
      );
    }
  }
};

/**
 * Cached by destination + dates + party size — repeat searches for the same
 * trip (viewing the trip page again, hitting "Refresh", another user
 * searching the same popular destination/dates) return instantly instead of
 * re-running the live API call or the multi-second AI fallback every time.
 */
export const searchHotels = (destination, checkInDate, checkOutDate, adults = 1) => {
  const cacheKey = `hotels:${destination.trim().toLowerCase()}:${checkInDate}:${checkOutDate}:${adults}`;

  return cached(cacheKey, HOTEL_CACHE_TTL_MS, () =>
    searchHotelsUncached(destination, checkInDate, checkOutDate, adults)
  );
};
