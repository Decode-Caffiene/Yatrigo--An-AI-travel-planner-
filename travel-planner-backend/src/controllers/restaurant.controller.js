import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { searchRestaurants } from "../services/restaurant.service.js";

export const search = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await searchRestaurants(destination);

  res.status(200).json({
    success: true,
    source: result.source,
    restaurants: result.restaurants,
  });
});
