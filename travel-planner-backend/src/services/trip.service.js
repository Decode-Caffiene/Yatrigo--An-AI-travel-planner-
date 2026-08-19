import Trip from "../models/trip.model.js";
import AppError from "../utils/AppError.js";
import { completePastTrips } from "../utils/autoCompleteTrips.js";
import { generateItinerary } from "./rag.service.js";
import { createNotification } from "./notification.service.js";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Create Trip
 */
export const createTrip = async (tripData, userId) => {
  const {
    destination,
    budget,
    travelers,
    interests,
    startDate,
    endDate,
    hotel,
    flights,
  } = tripData;

  if (new Date(startDate) > new Date(endDate)) {
    throw new AppError(
      "Start date cannot be greater than end date",
      400
    );
  }

  const trip = await Trip.create({
    user: userId,
    destination,
    budget,
    travelers,
    interests,
    startDate,
    endDate,
    hotel: hotel || null,
    flights: Array.isArray(flights) ? flights : [],
  });

  return trip;
};

/**
 * Get all trips of logged in user
 */
export const getUserTrips = async (userId) => {
  await completePastTrips(userId);

  const trips = await Trip.find({
    user: userId,
  }).sort({
    createdAt: -1,
  });

  return trips;
};

/**
 * Get one trip
 */
export const getTripById = async (tripId, userId) => {
  await completePastTrips(userId);

  const trip = await Trip.findOne({
    _id: tripId,
    user: userId,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  return trip;
};

/**
 * Update Trip
 */
export const updateTrip = async (
  tripId,
  userId,
  updateData
) => {
  if (
    updateData.startDate &&
    updateData.endDate &&
    new Date(updateData.startDate) >
      new Date(updateData.endDate)
  ) {
    throw new AppError(
      "Start date cannot be after end date",
      400
    );
  }

  // Cancelling is final. Enforced here rather than only in the UI, so the
  // rule holds however the API is called.
  if (updateData.status) {
    const current = await Trip.findOne({ _id: tripId, user: userId }).select(
      "status"
    );

    if (!current) {
      throw new AppError("Trip not found", 404);
    }

    if (current.status === "cancelled" && updateData.status !== "cancelled") {
      throw new AppError(
        "This trip was cancelled and cannot be reopened.",
        400
      );
    }
  }

  const trip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      user: userId,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  return trip;
};

/**
 * Delete Trip
 */
export const deleteTrip = async (
  tripId,
  userId
) => {
  const trip = await Trip.findOneAndDelete({
    _id: tripId,
    user: userId,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  return trip;
};

/**
 * Shared helper for generate/regenerate
 */
const saveRagItinerary = async (trip) => {
  const isRegeneration = !!trip.itinerary;

  const ragResponse = await generateItinerary(trip);

  trip.itinerary = ragResponse.itinerary;
  trip.itineraryGrounded = ragResponse.grounded;

  await trip.save();

  await createNotification({
    recipientId: trip.user,
    type: isRegeneration ? "itinerary_updated" : "itinerary_ready",
    tripId: trip._id,
  });

  return {
    itinerary: trip.itinerary,
    grounded: trip.itineraryGrounded,
    sources: ragResponse.sources,
  };
};

/**
 * Generate AI itinerary (only once)
 */
export const generateTripItinerary = async (
  tripId,
  userId
) => {
  const trip = await Trip.findOne({
    _id: tripId,
    user: userId,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  if (trip.itinerary) {
    throw new AppError(
      "Itinerary already exists. Use regenerate endpoint if needed.",
      400
    );
  }

  return await saveRagItinerary(trip);
};

/**
 * Regenerate AI itinerary
 */
export const regenerateTripItinerary = async (
  tripId,
  userId
) => {
  const trip = await Trip.findOne({
    _id: tripId,
    user: userId,
  });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  return await saveRagItinerary(trip);
};

/**
 * Notifies each planning trip's owner once, the first time this scan finds
 * their trip starting within the next 24 hours. Meant to be called on a
 * recurring timer (see server.js) rather than per-request.
 */
export const sendUpcomingTripReminders = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const trips = await Trip.find({
    status: "planning",
    startReminderSent: false,
    startDate: { $gte: now, $lte: windowEnd },
  });

  for (const trip of trips) {
    await createNotification({
      recipientId: trip.user,
      type: "trip_reminder",
      tripId: trip._id,
    });

    trip.startReminderSent = true;
    await trip.save();
  }

  return trips.length;
};