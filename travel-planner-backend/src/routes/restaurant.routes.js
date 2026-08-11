import express from "express";

import { search } from "../controllers/restaurant.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/search", protect, search);

export default router;
