import express from "express";

import {
  deleteMessage,
  editMessage,
  getMessages,
  getUnreadCount,
  listConversations,
  markRead,
  sendMessage,
  startConversation,
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/conversations", listConversations);
router.post("/conversations", startConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);
router.patch("/conversations/:id/messages/:messageId", editMessage);
router.delete("/conversations/:id/messages/:messageId", deleteMessage);
router.post("/conversations/:id/read", markRead);
router.get("/unread-count", getUnreadCount);

export default router;
