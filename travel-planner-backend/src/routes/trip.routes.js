import express from "express";

import {
  create,
  getAll,
  getOne,
  update,
  remove,
  generateAIItinerary,
  regenerateAIItinerary,
} from "../controllers/trip.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();


router
  .route("/")
  .post(protect, create)
  .get(protect, getAll);


router.post(
  "/generate/:tripId",
  protect,
  generateAIItinerary
);


router.post(
  "/regenerate/:tripId",
  protect,
  regenerateAIItinerary
);


router
  .route("/:id")
  .get(protect, getOne)
  .patch(protect, update)
  .delete(protect, remove);

export default router;