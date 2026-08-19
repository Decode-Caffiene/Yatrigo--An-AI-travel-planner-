import express from "express";

import {
  getProfile,
  searchUsers,
  toggleFollow,
  updateProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.patch("/me", updateProfile);
router.get("/search", searchUsers);
router.get("/:id", getProfile);
router.post("/:id/follow", toggleFollow);

export default router;
