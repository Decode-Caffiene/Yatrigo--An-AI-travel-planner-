import User from "../models/user.model.js";
import Trip from "../models/trip.model.js";
import Post from "../models/post.model.js";
import AppError from "../utils/AppError.js";
import { completePastTrips } from "../utils/autoCompleteTrips.js";
import { createNotification } from "./notification.service.js";

export const getUserProfile = async (userId, viewerId) => {
  const user = await User.findById(userId).select("name bio avatar followers");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // "Countries visited" only counts completed trips, so settle this
  // traveler's finished trips before reading them.
  await completePastTrips(userId);

  const completedTrips = await Trip.find({ user: userId, status: "completed" }).select(
    "destination"
  );
  const countriesVisited = [...new Set(completedTrips.map((t) => t.destination))];

  const postCount = await Post.countDocuments({ user: userId });
  const followingCount = await User.countDocuments({ followers: userId });

  const viewerIdStr = viewerId?.toString();

  return {
    id: user._id,
    name: user.name,
    bio: user.bio || "",
    avatar: user.avatar || null,
    countriesVisited,
    postCount,
    followerCount: user.followers.length,
    followingCount,
    isFollowedByMe: viewerIdStr
      ? user.followers.some((id) => id.toString() === viewerIdStr)
      : false,
    isOwnProfile: viewerIdStr === user._id.toString(),
  };
};

export const updateProfile = async (userId, data) => {
  const { name, bio, avatar } = data;
  const update = {};

  if (name !== undefined) update.name = name.trim();
  if (bio !== undefined) update.bio = bio.trim();
  if (avatar !== undefined) update.avatar = avatar;

  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  }).select("name bio avatar");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { id: user._id, name: user.name, bio: user.bio || "", avatar: user.avatar || null };
};

export const searchUsers = async (query, viewerId) => {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const users = await User.find({
    _id: { $ne: viewerId },
    name: { $regex: trimmed, $options: "i" },
  })
    .select("name avatar")
    .limit(10);

  return users.map((user) => ({
    id: user._id,
    name: user.name,
    avatar: user.avatar || null,
  }));
};

export const toggleFollow = async (targetUserId, viewerId) => {
  if (targetUserId.toString() === viewerId.toString()) {
    throw new AppError("You can't follow yourself.", 400);
  }

  const target = await User.findById(targetUserId);

  if (!target) {
    throw new AppError("User not found", 404);
  }

  const idx = target.followers.findIndex((id) => id.toString() === viewerId.toString());
  const nowFollowing = idx < 0;

  if (nowFollowing) {
    target.followers.push(viewerId);
  } else {
    target.followers.splice(idx, 1);
  }

  await target.save();

  if (nowFollowing) {
    await createNotification({ recipientId: targetUserId, actorId: viewerId, type: "follow" });
  }

  return { isFollowedByMe: nowFollowing, followerCount: target.followers.length };
};
