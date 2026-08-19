import express from "express";

import {
  getUnreadCount,
  listNotifications,
  markAllRead,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", listNotifications);
router.post("/read-all", markAllRead);
router.get("/unread-count", getUnreadCount);

export default router;
