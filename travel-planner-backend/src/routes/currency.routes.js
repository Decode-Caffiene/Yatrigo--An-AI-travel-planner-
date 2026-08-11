import express from "express";

import { convert, rates } from "../controllers/currency.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/convert", protect, convert);
router.get("/rates", protect, rates);

export default router;
