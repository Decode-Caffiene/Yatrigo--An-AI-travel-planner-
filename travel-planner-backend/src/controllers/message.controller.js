import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as messageService from "../services/message.service.js";

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await messageService.listConversations(req.user._id);

  res.status(200).json({ success: true, conversations });
});

export const startConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new AppError("userId is required.", 400);
  }

  const conversation = await messageService.findOrCreateConversation(req.user._id, userId);

  res.status(200).json({ success: true, conversation });
});

export const getMessages = asyncHandler(async (req, res) => {
  const result = await messageService.getMessages(
    req.user._id,
    req.params.id,
    req.query.before
  );

  res.status(200).json({ success: true, ...result });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(
    req.user._id,
    req.params.id,
    req.body.text,
    req.body.attachment
  );

  res.status(201).json({ success: true, message });
});

export const editMessage = asyncHandler(async (req, res) => {
  const message = await messageService.editMessage(
    req.user._id,
    req.params.id,
    req.params.messageId,
    req.body.text
  );

  res.status(200).json({ success: true, message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.user._id, req.params.id, req.params.messageId);

  res.status(200).json({ success: true });
});

export const markRead = asyncHandler(async (req, res) => {
  await messageService.markConversationRead(req.user._id, req.params.id);

  res.status(200).json({ success: true });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await messageService.getUnreadCount(req.user._id);

  res.status(200).json({ success: true, count });
});
