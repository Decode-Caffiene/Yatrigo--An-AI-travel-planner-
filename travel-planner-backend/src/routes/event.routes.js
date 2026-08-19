import express from "express";

import { aiEvents, eventDetails, upcomingEvents } from "../controllers/event.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/ai", protect, aiEvents);
router.get("/upcoming", protect, upcomingEvents);
router.get("/details", protect, eventDetails);

export default router;
