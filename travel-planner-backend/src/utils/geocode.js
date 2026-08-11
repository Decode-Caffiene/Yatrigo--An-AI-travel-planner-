import axios from "axios";

import AppError from "./AppError.js";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

/**
 * Typeahead place search — a live backup to the frontend's curated instant
 * list, for real cities/towns that list doesn't cover. The API has no
 * relevance ranking of its own — a short query mostly surfaces tiny
 * villages that happen to share the exact name — so we over-fetch and sort
 * by population ourselves to get real places to the top. Below ~3
 * characters the API returns little to nothing useful, so callers should
 * treat short queries as "no results yet" rather than an error.
 */
export const searchPlaces = async (query) => {
  const { data } = await axios.get(GEOCODING_URL, {
    params: { name: query, count: 100, language: "en" },
  });

  const results = data.results || [];

  results.sort((a, b) => (b.population || 0) - (a.population || 0));

  const seen = new Set();
  const places = [];

  for (const result of results) {
    const label =
      result.name === result.country
        ? result.name
        : `${result.name}, ${result.country}`;

    if (seen.has(label)) continue;
    seen.add(label);

    places.push({
      name: result.name,
      country: result.country || null,
      label,
    });

    if (places.length >= 8) break;
  }

  return places;
};

/**
 * City names are often ambiguous (e.g. "Chitwan" matches places in both
 * Nepal and India), so callers that know the expected country should pass
 * countryHint to pick the right match out of several candidates.
 */
export const geocode = async (place, countryHint) => {
  const { data } = await axios.get(GEOCODING_URL, {
    params: { name: place, count: countryHint ? 10 : 1 },
  });

  const results = data.results || [];

  if (results.length === 0) {
    throw new AppError(`Could not find location: ${place}`, 404);
  }

  let result = results[0];

  if (countryHint) {
    result = results.find(
      (r) => r.country?.toLowerCase() === countryHint.toLowerCase()
    );

    if (!result) {
      throw new AppError(
        `Could not find "${place}" in ${countryHint}. Try a more specific place name (e.g. the nearest city instead of a district or park name).`,
        404
      );
    }
  }

  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
};
