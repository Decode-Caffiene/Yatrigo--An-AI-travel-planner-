import asyncHandler from "../utils/asyncHandler.js";
import * as notificationService from "../services/notification.service.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listNotifications(
    req.user._id,
    req.query.limit
  );

  res.status(200).json({ success: true, notifications });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);

  res.status(200).json({ success: true });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);

  res.status(200).json({ success: true, count });
});
