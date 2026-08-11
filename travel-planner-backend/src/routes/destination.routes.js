import express from "express";

import {
  aiSuggestions,
  destinationGuide,
  destinationImage,
  travelQuiz,
} from "../controllers/destination.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/guide", protect, destinationGuide);
router.get("/image", protect, destinationImage);
router.post("/quiz", protect, travelQuiz);
router.get("/ai-suggestions", protect, aiSuggestions);

export default router;
