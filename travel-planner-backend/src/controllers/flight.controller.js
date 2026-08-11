import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getLiveAircraftNearby, getRecentAirportActivity } from "../services/flight.service.js";
import { searchAirports } from "../utils/airportLookup.js";

export const airportSearch = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || !query.trim()) {
    return res.status(200).json({ success: true, airports: [] });
  }

  res.status(200).json({
    success: true,
    airports: searchAirports(query.trim()),
  });
});

export const liveTraffic = asyncHandler(async (req, res) => {
  const { destination, country, radiusKm } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await getLiveAircraftNearby(
    destination,
    country,
    radiusKm ? Number(radiusKm) : undefined
  );

  res.status(200).json({
    success: true,
    aircraft: result,
  });
});

export const recentActivity = asyncHandler(async (req, res) => {
  const { destination, country } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await getRecentAirportActivity(destination, country);

  res.status(200).json({
    success: true,
    ...result,
  });
});
