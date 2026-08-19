import axios from "axios";

import AppError from "../utils/AppError.js";

const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

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
export const searchHotels = async (destination, checkInDate, checkOutDate, adults = 1) => {
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

    return hotels.map((entry) => ({
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
  } catch (error) {
    if (error instanceof AppError) throw error;

    console.error(error.response?.data || error.message);

    if (error.response?.status === 429) {
      throw new AppError(
        "Hotel search is rate-limited right now. Please wait a moment and try again, or enter your hotel details manually.",
        429
      );
    }

    throw new AppError(`Could not fetch hotel offers for "${destination}".`, 502);
  }
};
