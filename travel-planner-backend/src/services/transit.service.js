import axios from "axios";

import AppError from "../utils/AppError.js";
import { geocode } from "../utils/geocode.js";

const BASE_URL = "https://transit.land/api/v2/rest/stops";

/**
 * Transitland aggregates transit agencies' published GTFS feeds. Coverage
 * depends entirely on whether the local operator publishes one — expect
 * good results in the US/Europe and many empty results in places without a
 * formal GTFS feed (which includes most of rural/regional South Asia).
 * There's no full-schedule data here, just which stops/routes exist nearby.
 */
export const getNearbyTransit = async (destination, countryHint) => {
  if (!process.env.TRANSITLAND_API_KEY) {
    throw new AppError("TRANSITLAND_API_KEY is not configured.", 500);
  }

  const location = await geocode(destination, countryHint);

  try {
    const { data } = await axios.get(BASE_URL, {
      params: {
        lat: location.latitude,
        lon: location.longitude,
        radius: 2000,
        apikey: process.env.TRANSITLAND_API_KEY,
      },
    });

    return (data.stops || []).map((stop) => ({
      name: stop.stop_name,
      routesServed: (stop.route_stops || [])
        .map((rs) => rs.route?.route_long_name || rs.route?.route_short_name)
        .filter(Boolean),
      operators: [
        ...new Set(
          (stop.route_stops || [])
            .map((rs) => rs.route?.agency?.agency_name)
            .filter(Boolean)
        ),
      ],
    }));
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(`Could not fetch public transport data for "${destination}".`, 502);
  }
};
