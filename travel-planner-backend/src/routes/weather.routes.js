import express from "express";

import { forecast } from "../controllers/weather.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/forecast", protect, forecast);

export default router;
