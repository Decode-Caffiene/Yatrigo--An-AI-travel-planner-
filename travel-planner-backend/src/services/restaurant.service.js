import axios from "axios";

import AppError from "../utils/AppError.js";

const BASE_URL = "https://places-api.foursquare.com/places/search";
const API_VERSION = "2025-06-17";

/**
 * Foursquare over Yelp: Yelp Fusion's data is dense in the US/Canada but
 * thin almost everywhere else, which doesn't fit a global travel planner.
 * Foursquare's coverage is broader internationally.
 *
 * Foursquare replaced their old v3 Places API (api.foursquare.com/v3) with
 * this endpoint in 2024/2025 — the old one now returns 410 Gone. On the
 * free tier, "rating" and "price" are premium fields that burn paid
 * credits and 429 if requested without them, so this only asks for the
 * free fields; rating/price stay null until the account has paid credits.
 */
export const searchRestaurants = async (destination) => {
  if (!process.env.FOURSQUARE_API_KEY) {
    throw new AppError("FOURSQUARE_API_KEY is not configured.", 500);
  }

  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        query: "restaurant",
        near: destination,
        limit: 10,
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
      rating: null,
      price: null,
      address: place.location?.formatted_address,
      categories: place.categories?.map((category) => category.name) || [],
    }));
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(`Could not fetch restaurants for "${destination}".`, 502);
  }
};
