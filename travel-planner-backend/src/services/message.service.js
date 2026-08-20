import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/AppError.js";
import { getIO } from "../socket.js";

const MESSAGES_PAGE_SIZE = 30;

const toUserSummary = (user, lastReadAt) => ({
  id: user._id,
  name: user.name,
  avatar: user.avatar || null,
  lastReadAt: lastReadAt || null,
});

// Mongoose stores the attachment's kind as `attachmentType` (see
// message.model.js for why it can't be named `type` in the schema) — the
// API and frontend still talk about it as `attachment.type`.
const toAttachmentDTO = (attachment) =>
  attachment
    ? {
        url: attachment.url,
        type: attachment.attachmentType,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      }
    : null;

const toMessageDTO = (message) => ({
  id: message._id,
  conversationId: message.conversation,
  senderId: message.sender,
  text: message.deleted ? null : message.text || null,
  attachment: message.deleted ? null : toAttachmentDTO(message.attachment),
  deleted: message.deleted,
  edited: message.edited,
  createdAt: message.createdAt,
});

const ATTACHMENT_PREVIEW_LABELS = {
  image: "\u{1F4F7} Photo",
  file: "\u{1F4CE} File",
};

// A conversation-list preview needs some text even when the message itself
// is just an attachment with no caption.
const previewText = (text, attachmentType) =>
  text || (attachmentType ? ATTACHMENT_PREVIEW_LABELS[attachmentType] : "");

const emitToParticipants = (participants, event, payload) => {
  const io = getIO();
  if (!io || participants.length === 0) return;

  let room = io.to(participants[0].toString());
  for (const participantId of participants.slice(1)) {
    room = room.to(participantId.toString());
  }
  room.emit(event, payload);
};

const assertParticipant = (conversation, userId) => {
  const isParticipant = conversation.participants.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isParticipant) {
    throw new AppError("Conversation not found.", 404);
  }
};

export const findOrCreateConversation = async (userId, otherUserId) => {
  if (userId.toString() === otherUserId.toString()) {
    throw new AppError("You can't message yourself.", 400);
  }

  const otherUser = await User.findById(otherUserId).select("name avatar");
  if (!otherUser) {
    throw new AppError("User not found.", 404);
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, otherUserId],
    });
  }

  return {
    id: conversation._id,
    otherUser: toUserSummary(otherUser, conversation.lastReadAt.get(otherUserId.toString())),
    lastMessage: null,
    unreadCount: 0,
    updatedAt: conversation.updatedAt,
  };
};

export const listConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate("participants", "name avatar");

  return Promise.all(
    conversations.map(async (conversation) => {
      const otherUser = conversation.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      const lastReadAt = conversation.lastReadAt.get(userId.toString()) || new Date(0);
      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        sender: { $ne: userId },
        createdAt: { $gt: lastReadAt },
      });

      return {
        id: conversation._id,
        otherUser: otherUser
          ? toUserSummary(otherUser, conversation.lastReadAt.get(otherUser._id.toString()))
          : null,
        lastMessage: conversation.lastMessage?.text
          ? {
              text: conversation.lastMessage.text,
              senderId: conversation.lastMessage.sender,
              createdAt: conversation.lastMessage.createdAt,
            }
          : null,
        unreadCount,
        updatedAt: conversation.updatedAt,
      };
    })
  );
};

export const getMessages = async (userId, conversationId, before) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  assertParticipant(conversation, userId);

  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(MESSAGES_PAGE_SIZE + 1);

  const hasMore = messages.length > MESSAGES_PAGE_SIZE;
  const page = messages.slice(0, MESSAGES_PAGE_SIZE).reverse();

  return { messages: page.map(toMessageDTO), hasMore };
};

const ATTACHMENT_TYPES = ["image", "file"];

const validateAttachment = (attachment) => {
  if (!attachment) return undefined;

  const { url, type, name, mimeType, size } = attachment;
  if (
    typeof url !== "string" ||
    !url ||
    !ATTACHMENT_TYPES.includes(type) ||
    typeof name !== "string" ||
    !name ||
    typeof mimeType !== "string" ||
    !mimeType ||
    typeof size !== "number"
  ) {
    throw new AppError("Invalid attachment.", 400);
  }

  return { url, type, name, mimeType, size };
};

export const sendMessage = async (userId, conversationId, text, attachment) => {
  const trimmed = text?.trim() || "";
  const validAttachment = validateAttachment(attachment);

  if (!trimmed && !validAttachment) {
    throw new AppError("Message text or an attachment is required.", 400);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  assertParticipant(conversation, userId);

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    text: trimmed || undefined,
    attachment: validAttachment && {
      url: validAttachment.url,
      attachmentType: validAttachment.type,
      name: validAttachment.name,
      mimeType: validAttachment.mimeType,
      size: validAttachment.size,
    },
  });

  conversation.lastMessage = {
    text: previewText(trimmed, validAttachment?.type),
    sender: userId,
    createdAt: message.createdAt,
  };
  conversation.lastReadAt.set(userId.toString(), message.createdAt);
  await conversation.save();

  const dto = toMessageDTO(message);
  emitToParticipants(conversation.participants, "message:new", dto);

  return dto;
};

export const editMessage = async (userId, conversationId, messageId, text) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  assertParticipant(conversation, userId);

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) {
    throw new AppError("Message not found.", 404);
  }
  if (message.sender.toString() !== userId.toString()) {
    throw new AppError("You can only edit your own messages.", 403);
  }
  if (message.deleted) {
    throw new AppError("Can't edit a deleted message.", 400);
  }

  const trimmed = text?.trim() || "";
  if (!trimmed && !message.attachment) {
    throw new AppError("Message text is required.", 400);
  }

  message.text = trimmed || undefined;
  message.edited = true;
  await message.save();

  // If this is the conversation's most recent message, its preview needs
  // to reflect the edit too.
  if (conversation.lastMessage?.createdAt?.getTime() === message.createdAt.getTime()) {
    conversation.lastMessage = {
      text: previewText(trimmed, message.attachment?.attachmentType),
      sender: message.sender,
      createdAt: message.createdAt,
    };
    await conversation.save();
  }

  const dto = toMessageDTO(message);
  emitToParticipants(conversation.participants, "message:edited", dto);

  return dto;
};

export const deleteMessage = async (userId, conversationId, messageId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  assertParticipant(conversation, userId);

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) {
    throw new AppError("Message not found.", 404);
  }
  if (message.sender.toString() !== userId.toString()) {
    throw new AppError("You can only delete your own messages.", 403);
  }

  message.deleted = true;
  message.text = "";
  await message.save();

  // If the deleted message was the conversation's most recent one, the
  // preview shown in the conversation list needs to fall back to whatever
  // is now the newest surviving message.
  if (conversation.lastMessage?.createdAt?.getTime() === message.createdAt.getTime()) {
    const previous = await Message.findOne({
      conversation: conversationId,
      deleted: false,
    }).sort({ createdAt: -1 });

    conversation.lastMessage = previous
      ? {
          text: previewText(previous.text, previous.attachment?.attachmentType),
          sender: previous.sender,
          createdAt: previous.createdAt,
        }
      : null;
    await conversation.save();
  }

  emitToParticipants(conversation.participants, "message:deleted", {
    conversationId,
    messageId: message._id,
  });
};

export const markConversationRead = async (userId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }
  assertParticipant(conversation, userId);

  const readAt = new Date();
  conversation.lastReadAt.set(userId.toString(), readAt);
  await conversation.save();

  const otherParticipants = conversation.participants.filter(
    (id) => id.toString() !== userId.toString()
  );
  emitToParticipants(otherParticipants, "conversation:read", {
    conversationId,
    readerId: userId,
    readAt,
  });
};

export const getUnreadCount = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .select("_id lastReadAt")
    .lean();

  if (conversations.length === 0) return 0;

  const counts = await Promise.all(
    conversations.map((conversation) =>
      Message.countDocuments({
        conversation: conversation._id,
        sender: { $ne: userId },
        createdAt: { $gt: conversation.lastReadAt?.[userId.toString()] || new Date(0) },
      })
    )
  );

  return counts.reduce((sum, count) => sum + count, 0);
};
