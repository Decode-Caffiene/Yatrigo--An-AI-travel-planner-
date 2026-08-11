import express from "express";

import { requirement } from "../controllers/visa.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/requirement", protect, requirement);

export default router;
