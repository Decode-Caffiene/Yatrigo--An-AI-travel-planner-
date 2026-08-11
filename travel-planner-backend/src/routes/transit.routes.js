import express from "express";

import { nearby } from "../controllers/transit.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/nearby", protect, nearby);

export default router;
