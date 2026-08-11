import axios from "axios";

import AppError from "../utils/AppError.js";
import { geocode } from "../utils/geocode.js";

const OSRM_URL = "https://router.project-osrm.org";

/**
 * OSRM's public demo server only routes by road, so this only makes
 * sense for places reachable by driving (e.g. cities within a country),
 * not for legs that require a flight or ferry.
 */
export const optimizeRoute = async (places, countryHint) => {
  const locations = await Promise.all(
    places.map((place) => geocode(place, countryHint))
  );

  const coordinates = locations
    .map((loc) => `${loc.longitude},${loc.latitude}`)
    .join(";");

  try {
    const { data } = await axios.get(
      `${OSRM_URL}/trip/v1/driving/${coordinates}`,
      {
        params: {
          source: "first",
          roundtrip: false,
          overview: "false",
        },
      }
    );

    if (data.code !== "Ok") {
      throw new Error(data.message || data.code);
    }

    const orderedStops = data.waypoints
      .map((wp, i) => ({
        place: places[i],
        ...locations[i],
        order: wp.waypoint_index,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      order: orderedStops.map((stop) => stop.place),
      stops: orderedStops,
      totalDistanceKm: Number((data.trips[0].distance / 1000).toFixed(1)),
      totalDurationHours: Number((data.trips[0].duration / 3600).toFixed(1)),
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(
      "Could not compute an optimized route for the given places (they may not be road-connected).",
      502
    );
  }
};

export const getDistance = async (from, to, countryHint) => {
  const [fromLoc, toLoc] = await Promise.all([
    geocode(from, countryHint),
    geocode(to, countryHint),
  ]);

  const coordinates = `${fromLoc.longitude},${fromLoc.latitude};${toLoc.longitude},${toLoc.latitude}`;

  try {
    const { data } = await axios.get(
      `${OSRM_URL}/route/v1/driving/${coordinates}`,
      { params: { overview: "false" } }
    );

    if (data.code !== "Ok") {
      throw new Error(data.message || data.code);
    }

    return {
      from: fromLoc.name,
      to: toLoc.name,
      distanceKm: Number((data.routes[0].distance / 1000).toFixed(1)),
      durationHours: Number((data.routes[0].duration / 3600).toFixed(1)),
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(
      `Could not compute driving distance between ${from} and ${to} (they may not be road-connected).`,
      502
    );
  }
};
