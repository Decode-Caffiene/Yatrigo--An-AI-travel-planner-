import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import {
  generateAIEvents,
  generateGlobalUpcomingEvents,
  getEventDetails,
} from "../services/event.service.js";

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

export const upcomingEvents = asyncHandler(async (req, res) => {
  const result = await generateGlobalUpcomingEvents();

  res.status(200).json({
    success: true,
    events: result,
  });
});

export const eventDetails = asyncHandler(async (req, res) => {
  const { name, context } = req.query;

  if (!name) {
    throw new AppError("name is required.", 400);
  }

  const event = await getEventDetails(name, context);

  res.status(200).json({
    success: true,
    event,
  });
});
