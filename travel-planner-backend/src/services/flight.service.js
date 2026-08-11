import axios from "axios";

import AppError from "../utils/AppError.js";
import { geocode } from "../utils/geocode.js";
import { findNearestAirport } from "../utils/airportLookup.js";
import { getOpenSkyToken, OPENSKY_BASE_URL } from "../utils/openskyClient.js";

const KM_PER_DEGREE_LAT = 111;
const DEFAULT_RADIUS_KM = 50;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/**
 * OpenSky has no route/price flight search — it's live ADS-B tracking
 * data. This returns aircraft currently airborne near the destination as
 * a live-traffic snapshot, not bookable flights. No API key needed.
 */
export const getLiveAircraftNearby = async (
  destination,
  countryHint,
  radiusKm = DEFAULT_RADIUS_KM
) => {
  const location = await geocode(destination, countryHint);

  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lonDelta =
    radiusKm / (KM_PER_DEGREE_LAT * Math.cos((location.latitude * Math.PI) / 180));

  try {
    const { data } = await axios.get(`${OPENSKY_BASE_URL}/states/all`, {
      params: {
        lamin: location.latitude - latDelta,
        lomin: location.longitude - lonDelta,
        lamax: location.latitude + latDelta,
        lomax: location.longitude + lonDelta,
      },
    });

    return (data.states || []).map((state) => ({
      callsign: state[1]?.trim() || null,
      originCountry: state[2],
      longitude: state[5],
      latitude: state[6],
      altitudeM: state[7],
      onGround: state[8],
      velocityMs: state[9],
      heading: state[10],
    }));
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(`Could not fetch live air traffic near "${destination}".`, 502);
  }
};

/**
 * Recent commercial activity at the destination's nearest airport, as a
 * stand-in for real flight search: OpenSky can only report which aircraft
 * actually flew in/out in the past (max 7-day window), never upcoming
 * scheduled flights or prices.
 */
export const getRecentAirportActivity = async (destination, countryHint) => {
  const location = await geocode(destination, countryHint);
  const airport = findNearestAirport(location.latitude, location.longitude);

  const token = await getOpenSkyToken();

  const end = Math.floor(Date.now() / 1000);
  const begin = end - SEVEN_DAYS_SECONDS;

  const mapFlight = (flight) => ({
    callsign: flight.callsign?.trim() || null,
    firstSeen: new Date(flight.firstSeen * 1000).toISOString(),
    lastSeen: new Date(flight.lastSeen * 1000).toISOString(),
    departureAirport: flight.estDepartureAirport,
    arrivalAirport: flight.estArrivalAirport,
  });

  try {
    const [arrivals, departures] = await Promise.all([
      axios.get(`${OPENSKY_BASE_URL}/flights/arrival`, {
        params: { airport: airport.icao, begin, end },
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${OPENSKY_BASE_URL}/flights/departure`, {
        params: { airport: airport.icao, begin, end },
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    return {
      airport: `${airport.name} (${airport.icao})`,
      windowDays: 7,
      arrivals: arrivals.data.map(mapFlight),
      departures: departures.data.map(mapFlight),
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(
      `Could not fetch recent airport activity for "${destination}".`,
      502
    );
  }
};
