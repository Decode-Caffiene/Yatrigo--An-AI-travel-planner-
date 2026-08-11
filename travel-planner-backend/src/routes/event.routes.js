import express from "express";

import { aiEvents } from "../controllers/event.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/ai", protect, aiEvents);

export default router;
