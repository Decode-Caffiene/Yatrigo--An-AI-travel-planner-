import express from "express";

import { translate } from "../controllers/translate.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, translate);

export default router;
