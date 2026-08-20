import axios from "axios";

import AppError from "../utils/AppError.js";
import { createChatCompletion, wasFallbackAlreadyAttempted } from "../utils/aiClient.js";
import { AI_CONFIG } from "../config/ai.js";
import { cached } from "../utils/cache.js";

const BASE_URL = "https://places-api.foursquare.com/places/search";
const API_VERSION = "2025-06-17";
const RESULTS_COUNT = 10;
// Restaurants don't shift day to day the way hotel prices do, so this can
// safely be as long-lived as the events cache.
const RESTAURANT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const sortByRatingDesc = (restaurants) =>
  [...restaurants].sort((a, b) => {
    if (a.rating == null && b.rating == null) return 0;
    if (a.rating == null) return 1;
    if (b.rating == null) return -1;
    return b.rating - a.rating;
  });

const requestFoursquareRestaurants = async (destination) => {
  if (!process.env.FOURSQUARE_API_KEY) {
    throw new AppError("FOURSQUARE_API_KEY is not configured.", 500);
  }

  const { data } = await axios.get(BASE_URL, {
    params: {
      query: "restaurant",
      near: destination,
      limit: RESULTS_COUNT,
      fields: "name,location,categories",
    },
    headers: {
      Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY}`,
      Accept: "application/json",
      "X-Places-Api-Version": API_VERSION,
    },
  });

  return data.results.map((place) => ({
    name: place.name,
    address: place.location?.formatted_address || null,
    categories: place.categories?.map((category) => category.name) || [],
  }));
};

/**
 * Foursquare's free tier doesn't expose real "rating"/"price" (premium
 * fields that burn paid credits / 429 if requested without them), but the
 * feature needs to rank "top N best" by something — so a single Groq call
 * estimates a rating, price tier, and one-line reason for the real venues
 * Foursquare returned. The venues themselves (name/address/categories) are
 * always real; only the rating/price/reason are the model's estimate,
 * flagged as such for the UI.
 */
const enrichWithAIRatings = async (destination, restaurants) => {
  const completion = await createChatCompletion({
    model: AI_CONFIG.lightModel,
    temperature: 0.3,
    max_completion_tokens: 3000,
    messages: [
      {
        role: "system",
        content:
          "You are a restaurant recommendation assistant. You'll be given a " +
          "JSON array of real restaurants (name, categories) in a destination. " +
          "For each one, estimate a typical diner rating and price tier based " +
          "on its name, cuisine, and reputation if you recognize it. Respond " +
          "with ONLY a raw JSON array (no markdown fences, no commentary) with " +
          "exactly as many items as you were given, IN THE SAME ORDER, where " +
          'each item has exactly these fields: "rating" (number, your best ' +
          "estimate of a typical diner satisfaction score on a 1-5 scale, one " +
          'decimal place), "priceTier" (string, one of "$", "$$", "$$$", ' +
          '"$$$$"), "reason" (string, one short sentence on why it\'s worth ' +
          "visiting).",
      },
      {
        role: "user",
        content: `Destination: ${destination}\nRestaurants: ${JSON.stringify(
          restaurants.map((r) => ({ name: r.name, categories: r.categories }))
        )}`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length !== restaurants.length) {
    throw new Error("AI ratings response didn't match the input restaurant list.");
  }

  return restaurants.map((restaurant, index) => ({
    ...restaurant,
    rating: typeof parsed[index]?.rating === "number" ? parsed[index].rating : null,
    ratingIsEstimate: true,
    priceTier: parsed[index]?.priceTier || null,
    reason: parsed[index]?.reason || null,
  }));
};

const requestAIRestaurantSuggestions = async (destination) => {
  const completion = await createChatCompletion({
    model: AI_CONFIG.model,
    temperature: 0.4,
    max_completion_tokens: 3500,
    messages: [
      {
        role: "system",
        content:
          "You are a restaurant recommendation assistant. Given a travel " +
          `destination, list the ${RESULTS_COUNT} best restaurants there, ` +
          "spanning a mix of iconic/famous spots, mid-range favorites, and " +
          "well-regarded budget options. Prefer real, well-known restaurant " +
          "names you're confident actually exist; if you're not confident a " +
          "specific name is real, describe a specific type of dining/area " +
          "instead. Order the array from highest to lowest rating. Respond " +
          "with ONLY a raw JSON array (no markdown fences, no commentary) of " +
          `exactly ${RESULTS_COUNT} items, where each item has exactly these ` +
          'fields: "name" (string), "categories" (array of 1-2 short cuisine/' +
          'type strings), "area" (string, the neighborhood or area), ' +
          '"priceTier" (string, one of "$", "$$", "$$$", "$$$$"), "rating" ' +
          "(number, your best estimate of a typical diner satisfaction score " +
          'on a 1-5 scale, one decimal place), "reason" (string, one short ' +
          "sentence on why).",
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

  return parsed.map((item) => ({
    name: String(item.name || "Recommended restaurant"),
    address: null,
    categories: Array.isArray(item.categories) ? item.categories : [],
    area: item.area || null,
    rating: typeof item.rating === "number" ? item.rating : null,
    ratingIsEstimate: true,
    priceTier: item.priceTier || null,
    reason: item.reason || null,
  }));
};

/**
 * Real Foursquare venues enriched with AI-estimated ratings so the list can
 * be ranked "top N best" (source: "live" — the venues are real even though
 * rating/price are estimated). Falls back to a fully AI-generated list
 * (source: "ai") if Foursquare itself is unavailable, so a missing/expired
 * key or an outage doesn't block the feature entirely.
 */
const searchRestaurantsUncached = async (destination) => {
  try {
    const restaurants = await requestFoursquareRestaurants(destination);

    if (restaurants.length === 0) {
      throw new AppError(`Could not find restaurants for "${destination}".`, 404);
    }

    try {
      const enriched = await enrichWithAIRatings(destination, restaurants);
      return { source: "live", restaurants: sortByRatingDesc(enriched) };
    } catch (enrichError) {
      console.error("Restaurant AI rating enrichment failed:", enrichError.message);
      // Real venues without a usable rating still beat no results at all.
      return {
        source: "live",
        restaurants: restaurants.map((r) => ({
          ...r,
          rating: null,
          ratingIsEstimate: false,
          priceTier: null,
          reason: null,
        })),
      };
    }
  } catch (error) {
    console.error(error.response?.data || error.message);

    try {
      let parsed;
      try {
        parsed = await requestAIRestaurantSuggestions(destination);
      } catch (retryError) {
        if (wasFallbackAlreadyAttempted(retryError)) throw retryError;
        parsed = await requestAIRestaurantSuggestions(destination);
      }

      return { source: "ai", restaurants: sortByRatingDesc(parsed) };
    } catch (fallbackError) {
      console.error("AI restaurant fallback failed:", fallbackError.message);

      if (error instanceof AppError) throw error;
      throw new AppError(`Could not fetch restaurants for "${destination}".`, 502);
    }
  }
};

/**
 * Cached by destination — repeat searches (viewing the trip page again,
 * multiple users searching the same popular destination) return instantly
 * instead of re-running the Foursquare call plus AI rating enrichment.
 */
export const searchRestaurants = (destination) => {
  const cacheKey = `restaurants:${destination.trim().toLowerCase()}`;

  return cached(cacheKey, RESTAURANT_CACHE_TTL_MS, () =>
    searchRestaurantsUncached(destination)
  );
};
