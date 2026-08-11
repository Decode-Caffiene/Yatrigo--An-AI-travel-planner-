import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { optimizeRoute, getDistance } from "../services/route.service.js";
import { searchPlaces } from "../utils/geocode.js";

export const optimize = asyncHandler(async (req, res) => {
  const { places, country } = req.body;

  if (!Array.isArray(places) || places.length < 2) {
    throw new AppError("Provide a 'places' array with at least 2 locations.", 400);
  }

  const result = await optimizeRoute(places, country);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const search = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 3) {
    return res.status(200).json({ success: true, places: [] });
  }

  const places = await searchPlaces(query.trim());

  res.status(200).json({
    success: true,
    places,
  });
});

export const distance = asyncHandler(async (req, res) => {
  const { from, to, country } = req.query;

  if (!from || !to) {
    throw new AppError("from and to are required.", 400);
  }

  const result = await getDistance(from, to, country);

  res.status(200).json({
    success: true,
    ...result,
  });
});
