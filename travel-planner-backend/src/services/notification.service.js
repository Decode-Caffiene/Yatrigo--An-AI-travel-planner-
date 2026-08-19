import Notification from "../models/notification.model.js";
import { getIO } from "../socket.js";

const MESSAGE_BY_TYPE = {
  follow: (n) => `${n.actor.name} started following you`,
  like: (n) => `${n.actor.name} liked your post`,
  comment: (n) => `${n.actor.name} commented on your post`,
  upvote: (n) => `${n.actor.name} upvoted your comment`,
  best_answer: (n) => `${n.actor.name} marked your answer as the best answer`,
  itinerary_ready: (n) =>
    `Your itinerary for ${n.trip?.destination ?? "your trip"} is ready`,
  itinerary_updated: (n) =>
    `Your itinerary for ${n.trip?.destination ?? "your trip"} was updated`,
  trip_reminder: (n) =>
    `Your trip to ${n.trip?.destination ?? "your destination"} starts soon`,
};

const LINK_BY_TYPE = {
  follow: (n) => `/community/u/${n.actor._id}`,
  like: (n) => `/community/posts/${n.post}`,
  comment: (n) => `/community/posts/${n.post}`,
  upvote: (n) => `/community/posts/${n.post}`,
  best_answer: (n) => `/community/posts/${n.post}`,
  itinerary_ready: (n) => `/trips/${n.trip?._id}?tab=itinerary`,
  itinerary_updated: (n) => `/trips/${n.trip?._id}?tab=itinerary`,
  trip_reminder: (n) => `/trips/${n.trip?._id}`,
};

const toDTO = (notification) => ({
  id: notification._id,
  type: notification.type,
  message: MESSAGE_BY_TYPE[notification.type](notification),
  link: LINK_BY_TYPE[notification.type](notification),
  actor: notification.actor
    ? {
        id: notification.actor._id.toString(),
        name: notification.actor.name,
        avatar: notification.actor.avatar || null,
      }
    : null,
  read: notification.read,
  createdAt: notification.createdAt,
});

/**
 * Fires a notification for `recipientId`. When `actorId` is given (social
 * interactions — follow/like/comment/etc.) it's skipped if the recipient is
 * the actor, since liking your own post shouldn't notify you; system
 * notifications (itinerary ready, trip reminders) have no actor and always
 * fire. Pushed live over the same per-user Socket.IO room the chat feature
 * uses.
 */
export const createNotification = async ({
  recipientId,
  actorId = null,
  type,
  postId,
  commentId,
  tripId,
}) => {
  if (actorId && recipientId.toString() === actorId.toString()) return;

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId || undefined,
    type,
    post: postId,
    comment: commentId,
    trip: tripId,
  });

  await notification.populate([
    { path: "actor", select: "name avatar" },
    { path: "trip", select: "destination" },
  ]);

  const dto = toDTO(notification);

  const io = getIO();
  if (io) {
    io.to(recipientId.toString()).emit("notification:new", dto);
  }

  return dto;
};

export const listNotifications = async (userId, limit = 30) => {
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 50))
    .populate("actor", "name avatar")
    .populate("trip", "destination");

  return notifications.map(toDTO);
};

export const markAllRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } }
  );
};

export const getUnreadCount = (userId) =>
  Notification.countDocuments({ recipient: userId, read: false });
