import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import {
  generateAISuggestions,
  generateDestinationGuide,
  generateQuizRecommendations,
  getBestImage,
  resolveLandmark,
} from "../services/destination.service.js";
import { cached } from "../utils/cache.js";
import Trip from "../models/trip.model.js";

const AI_SUGGESTIONS_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const destinationGuide = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const result = await generateDestinationGuide(destination);

  res.status(200).json({
    success: true,
    guide: result,
  });
});

// Lightweight — just the photo, no full guide. Used for cover images on
// trip cards, where fetching an entire AI-written guide per card would be
// wasteful. Still does one small Groq call to resolve broad destinations
// (e.g. a country) down to a specific, recognizable landmark to search for.
export const destinationImage = asyncHandler(async (req, res) => {
  const { destination } = req.query;

  if (!destination) {
    throw new AppError("destination is required.", 400);
  }

  const landmark = await resolveLandmark(destination);
  const imageUrl = await getBestImage(destination, landmark);

  res.status(200).json({
    success: true,
    imageUrl,
  });
});

export const travelQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new AppError("answers object is required.", 400);
  }

  const recommendations = await generateQuizRecommendations(answers);

  res.status(200).json({
    success: true,
    recommendations,
  });
});

export const aiSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await cached(
    `ai-suggestions:${req.user._id}`,
    AI_SUGGESTIONS_TTL_MS,
    async () => {
      const trips = await Trip.find({ user: req.user._id }).select(
        "destination interests"
      );

      const visitedOrPlanned = [...new Set(trips.map((trip) => trip.destination))];
      const interests = [...new Set(trips.flatMap((trip) => trip.interests))];

      return generateAISuggestions({ visitedOrPlanned, interests });
    }
  );

  res.status(200).json({
    success: true,
    suggestions,
  });
});
