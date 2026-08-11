import express from "express";

import {
  airportSearch,
  liveTraffic,
  recentActivity,
} from "../controllers/flight.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/live", protect, liveTraffic);
router.get("/recent-activity", protect, recentActivity);
router.get("/airports", protect, airportSearch);

export default router;
