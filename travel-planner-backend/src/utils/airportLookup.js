import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

import AppError from "./AppError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Trimmed from OurAirports' public dataset (large/medium airports with
 * scheduled commercial service only) so we can resolve a city to the ICAO
 * airport code OpenSky's flight endpoints require.
 */
const airports = JSON.parse(
  readFileSync(path.join(__dirname, "../data/airports.json"), "utf-8")
);

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

export const findNearestAirport = (latitude, longitude) => {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const airport of airports) {
    const distance = haversineKm(latitude, longitude, airport.lat, airport.lon);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = airport;
    }
  }

  if (!nearest) {
    throw new AppError("Could not find a nearby airport.", 404);
  }

  return { ...nearest, distanceKm: Number(nearestDistance.toFixed(1)) };
};

/**
 * Typeahead over the airport list for the flight form. Matches IATA code,
 * airport name, or city, and ranks exact-code then prefix matches first so
 * typing "KTM" or "Kath" both land on Kathmandu at the top.
 */
export const searchAirports = (query, limit = 8) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact = [];
  const prefix = [];
  const partial = [];

  for (const airport of airports) {
    if (!airport.iata) continue;

    const iata = airport.iata.toLowerCase();
    const name = airport.name.toLowerCase();
    const city = (airport.municipality || "").toLowerCase();

    if (iata === q) exact.push(airport);
    else if (city.startsWith(q) || name.startsWith(q)) prefix.push(airport);
    else if (city.includes(q) || name.includes(q)) partial.push(airport);
  }

  return [...exact, ...prefix, ...partial].slice(0, limit).map((airport) => ({
    iata: airport.iata,
    name: airport.name,
    city: airport.municipality || null,
    country: airport.country,
  }));
};
