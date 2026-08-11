import asyncHandler from "../utils/asyncHandler.js";

import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  generateTripItinerary,
  regenerateTripItinerary,
} from "../services/trip.service.js";

/**
 * Create Trip
 */
export const create = asyncHandler(async (req, res) => {
  const trip = await createTrip(
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: "Trip created successfully",
    trip,
  });
});

/**
 * Get all trips
 */
export const getAll = asyncHandler(async (req, res) => {
  const trips = await getUserTrips(req.user._id);

  res.status(200).json({
    success: true,
    count: trips.length,
    trips,
  });
});

/**
 * Get one trip
 */
export const getOne = asyncHandler(async (req, res) => {
  const trip = await getTripById(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    trip,
  });
});

/**
 * Update trip
 */
export const update = asyncHandler(async (req, res) => {
  const trip = await updateTrip(
    req.params.id,
    req.user._id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Trip updated successfully",
    trip,
  });
});

/**
 * Delete trip
 */
export const remove = asyncHandler(async (req, res) => {
  await deleteTrip(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully",
  });
});

/**
 * Generate AI itinerary using RAG (only once)
 */
export const generateAIItinerary =
  asyncHandler(async (req, res) => {
    const result =
      await generateTripItinerary(
        req.params.tripId,
        req.user._id
      );

    res.status(200).json({
      success: true,
      itinerary: result.itinerary,
      grounded: result.grounded,
      sources: result.sources,
    });
  });

/**
 * Regenerate AI itinerary using RAG
 */
export const regenerateAIItinerary =
  asyncHandler(async (req, res) => {
    const result =
      await regenerateTripItinerary(
        req.params.tripId,
        req.user._id
      );

    res.status(200).json({
      success: true,
      itinerary: result.itinerary,
      grounded: result.grounded,
      sources: result.sources,
    });
  });