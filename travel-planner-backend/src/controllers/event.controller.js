import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { generateAIEvents } from "../services/event.service.js";

export const aiEvents = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await generateAIEvents(destination);

  res.status(200).json({
    success: true,
    events: result,
  });
});
