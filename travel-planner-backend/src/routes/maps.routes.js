import express from "express";

import { optimize, distance, search } from "../controllers/maps.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/optimize-route", protect, optimize);
router.get("/distance", protect, distance);
router.get("/search", protect, search);

export default router;
