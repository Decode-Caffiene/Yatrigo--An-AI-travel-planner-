import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { searchHotels } from "../services/hotel.service.js";

export const search = asyncHandler(async (req, res) => {
  const { destination, checkInDate, checkOutDate, adults } = req.query;

  if (!destination || !checkInDate || !checkOutDate) {
    throw new AppError("destination, checkInDate and checkOutDate are required.", 400);
  }

  const result = await searchHotels(
    destination,
    checkInDate,
    checkOutDate,
    adults ? Number(adults) : 1
  );

  res.status(200).json({
    success: true,
    source: result.source,
    hotels: result.hotels,
  });
});
