import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getWeatherForecast } from "../services/weather.service.js";

export const forecast = asyncHandler(async (req, res) => {
  const { destination, startDate, endDate, country } = req.query;

  if (!destination || !startDate || !endDate) {
    throw new AppError("destination, startDate and endDate are required.", 400);
  }

  const result = await getWeatherForecast(destination, startDate, endDate, country);

  res.status(200).json({
    success: true,
    ...result,
  });
});
