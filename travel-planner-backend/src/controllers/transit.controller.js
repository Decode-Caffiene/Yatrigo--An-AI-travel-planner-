import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getNearbyTransit } from "../services/transit.service.js";

export const nearby = asyncHandler(async (req, res) => {
  const { destination, country } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await getNearbyTransit(destination, country);

  res.status(200).json({
    success: true,
    stops: result,
  });
});
