import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Trip from "../models/trip.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/AppError.js";
import { completePastTrips } from "../utils/autoCompleteTrips.js";

const POST_TYPES = ["story", "review", "question"];

const serializePost = (post, viewerId) => {
  const viewerIdStr = viewerId?.toString();

  return {
    _id: post._id,
    user: {
      id: post.user._id,
      name: post.user.name,
      avatar: post.user.avatar || null,
    },
    type: post.type,
    content: post.content,
    images: post.images,
    destination: post.destination || null,
    travelType: post.travelType || null,
    visitedDate: post.visitedDate || null,
    rating: post.rating ?? null,
    review: post.review || null,
    trip: post.trip || null,
    itinerarySnapshot: post.itinerarySnapshot || null,
    likeCount: post.likes.length,
    likedByMe: viewerIdStr
      ? post.likes.some((id) => id.toString() === viewerIdStr)
      : false,
    saveCount: post.saves.length,
    savedByMe: viewerIdStr
      ? post.saves.some((id) => id.toString() === viewerIdStr)
      : false,
    commentCount: post.commentCount,
    bestAnswerComment: post.bestAnswerComment || null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
};

const serializeComment = (comment, viewerId) => {
  const viewerIdStr = viewerId?.toString();

  return {
    _id: comment._id,
    post: comment.post,
    user: {
      id: comment.user._id,
      name: comment.user.name,
      avatar: comment.user.avatar || null,
    },
    content: comment.content,
    upvoteCount: comment.upvotes.length,
    upvotedByMe: viewerIdStr
      ? comment.upvotes.some((id) => id.toString() === viewerIdStr)
      : false,
    createdAt: comment.createdAt,
  };
};

/**
 * Create a story, review, or question post.
 * (Itinerary posts are only created via shareItineraryToCommunity.)
 */
export const createPost = async (userId, data) => {
  const { type, content, images, destination, travelType, visitedDate, rating, review } =
    data;

  if (!POST_TYPES.includes(type)) {
    throw new AppError("Invalid post type.", 400);
  }

  if (!content || !content.trim()) {
    throw new AppError("Post content is required.", 400);
  }

  if (type === "review" && !rating) {
    throw new AppError("A rating is required for reviews.", 400);
  }

  const post = await Post.create({
    user: userId,
    type,
    content: content.trim(),
    images: Array.isArray(images) ? images.slice(0, 4) : [],
    destination: destination?.trim() || undefined,
    travelType: travelType || undefined,
    visitedDate: visitedDate || undefined,
    rating: type === "review" ? rating : undefined,
    review: type === "review" ? review : undefined,
  });

  await post.populate("user", "name avatar");
  return serializePost(post, userId);
};

export const listPosts = async (
  viewerId,
  { type, following, saved, author, limit } = {}
) => {
  const query = {};

  if (type && type !== "all") {
    query.type = type;
  }

  if (following === "true" || following === true) {
    const followedUsers = await User.find({ followers: viewerId }).select("_id");
    query.user = { $in: followedUsers.map((u) => u._id) };
  }

  if (saved === "true" || saved === true) {
    query.saves = viewerId;
  }

  if (author) {
    query.user = author;
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .populate("user", "name avatar");

  return posts.map((post) => serializePost(post, viewerId));
};

export const getPostById = async (postId, viewerId) => {
  const post = await Post.findById(postId).populate("user", "name avatar");

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate("user", "name avatar");

  return {
    post: serializePost(post, viewerId),
    comments: comments.map((comment) => serializeComment(comment, viewerId)),
  };
};

export const deletePost = async (postId, userId) => {
  const post = await Post.findOneAndDelete({ _id: postId, user: userId });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  await Comment.deleteMany({ post: postId });
};

export const toggleLike = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const idx = post.likes.findIndex((id) => id.toString() === userId.toString());
  if (idx >= 0) {
    post.likes.splice(idx, 1);
  } else {
    post.likes.push(userId);
  }

  await post.save();
  await post.populate("user", "name avatar");
  return serializePost(post, userId);
};

export const toggleSave = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const idx = post.saves.findIndex((id) => id.toString() === userId.toString());
  if (idx >= 0) {
    post.saves.splice(idx, 1);
  } else {
    post.saves.push(userId);
  }

  await post.save();
  await post.populate("user", "name avatar");
  return serializePost(post, userId);
};

export const addComment = async (postId, userId, content) => {
  if (!content || !content.trim()) {
    throw new AppError("Comment content is required.", 400);
  }

  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  const comment = await Comment.create({
    post: postId,
    user: userId,
    content: content.trim(),
  });

  post.commentCount += 1;
  await post.save();

  await comment.populate("user", "name avatar");
  return serializeComment(comment, userId);
};

export const toggleCommentUpvote = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  const idx = comment.upvotes.findIndex((id) => id.toString() === userId.toString());
  if (idx >= 0) {
    comment.upvotes.splice(idx, 1);
  } else {
    comment.upvotes.push(userId);
  }

  await comment.save();
  await comment.populate("user", "name avatar");
  return serializeComment(comment, userId);
};

export const markBestAnswer = async (postId, userId, commentId) => {
  const post = await Post.findOne({ _id: postId, user: userId });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.type !== "question") {
    throw new AppError("Only question posts can have a best answer.", 400);
  }

  const comment = await Comment.findOne({ _id: commentId, post: postId });

  if (!comment) {
    throw new AppError("Comment not found on this post.", 404);
  }

  post.bestAnswerComment = comment._id;
  await post.save();
  await post.populate("user", "name avatar");
  return serializePost(post, userId);
};

export const shareItineraryToCommunity = async (tripId, userId) => {
  const trip = await Trip.findOne({ _id: tripId, user: userId });

  if (!trip) {
    throw new AppError("Trip not found", 404);
  }

  if (!trip.itinerary) {
    throw new AppError("This trip doesn't have an AI itinerary yet.", 400);
  }

  const post = await Post.create({
    user: userId,
    type: "itinerary",
    content: `Check out my AI-generated itinerary for ${trip.destination}!`,
    destination: trip.destination,
    trip: trip._id,
    itinerarySnapshot: trip.itinerary,
  });

  await post.populate("user", "name avatar");
  return serializePost(post, userId);
};

export const copyItineraryFromPost = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.type !== "itinerary" || !post.itinerarySnapshot) {
    throw new AppError("This post doesn't have a shareable itinerary.", 400);
  }

  const dayCount = Array.isArray(post.itinerarySnapshot.days)
    ? post.itinerarySnapshot.days.length
    : 7;

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.max(dayCount - 1, 1));

  const trip = await Trip.create({
    user: userId,
    destination: post.destination || "Unknown",
    budget: post.itinerarySnapshot.totalEstimatedBudget || 0,
    travelers: 1,
    interests: [],
    startDate,
    endDate,
    itinerary: post.itinerarySnapshot,
    itineraryGrounded: false,
    status: "planning",
  });

  return trip;
};

export const getTrendingDestinations = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const results = await Post.aggregate([
    { $match: { destination: { $nin: [null, ""] }, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: "$destination", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return results.map((r) => ({ destination: r._id, count: r.count }));
};

export const getTopTravelers = async () => {
  // Ranks on completed trips, so make sure finished trips have actually
  // been flipped before counting — otherwise travelers whose trips ended
  // while they were away from the app are undercounted.
  await completePastTrips();

  const tripStats = await Trip.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$user", countries: { $addToSet: "$destination" } } },
  ]);

  const postStats = await Post.aggregate([
    { $group: { _id: "$user", postCount: { $sum: 1 } } },
  ]);

  const postCountMap = new Map(postStats.map((p) => [p._id.toString(), p.postCount]));

  const ranked = tripStats
    .map((t) => ({
      userId: t._id,
      countriesCount: t.countries.length,
      postCount: postCountMap.get(t._id.toString()) || 0,
    }))
    .sort((a, b) => b.countriesCount - a.countriesCount || b.postCount - a.postCount)
    .slice(0, 5);

  const users = await User.find({ _id: { $in: ranked.map((r) => r.userId) } }).select(
    "name avatar"
  );
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return ranked
    .map((r) => {
      const user = userMap.get(r.userId.toString());
      if (!user) return null;

      return {
        id: user._id,
        name: user.name,
        avatar: user.avatar || null,
        countriesCount: r.countriesCount,
        postCount: r.postCount,
      };
    })
    .filter(Boolean);
};
