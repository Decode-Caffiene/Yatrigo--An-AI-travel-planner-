import Trip from "../models/trip.model.js";

// A global sweep touches every user's trips, so it only needs to run
// occasionally — throttle it rather than firing on every community page load.
const GLOBAL_SWEEP_THROTTLE_MS = 5 * 60 * 1000;

let lastGlobalSweep = 0;

/**
 * A trip's endDate is its final *day*, so it isn't over until that day has
 * fully passed — comparing against "now" would flip a trip to completed
 * halfway through its last day.
 */
const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Move trips whose end date has passed from "planning" to "completed".
 *
 * Only "planning" trips are touched — a cancelled trip stays cancelled, and
 * an already-completed one is left alone. Done as a DB write rather than a
 * display-time guess so the aggregations that filter on status (countries
 * visited, Top Travelers) see the same truth the user sees.
 *
 * Pass a userId to sweep just that traveler's trips (cheap, safe to run on
 * every read); omit it for a global sweep, which self-throttles.
 */
export const completePastTrips = async (userId) => {
  if (!userId) {
    if (Date.now() - lastGlobalSweep < GLOBAL_SWEEP_THROTTLE_MS) return 0;
    lastGlobalSweep = Date.now();
  }

  const filter = {
    status: "planning",
    endDate: { $lt: startOfToday() },
  };

  if (userId) filter.user = userId;

  const result = await Trip.updateMany(filter, { $set: { status: "completed" } });

  return result.modifiedCount ?? 0;
};
