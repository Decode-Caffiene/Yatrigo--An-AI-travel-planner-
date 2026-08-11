import asyncHandler from "../utils/asyncHandler.js";
import * as communityService from "../services/community.service.js";

export const createPost = asyncHandler(async (req, res) => {
  const post = await communityService.createPost(req.user._id, req.body);

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    post,
  });
});

export const listPosts = asyncHandler(async (req, res) => {
  const { type, following, saved, author, limit } = req.query;
  const posts = await communityService.listPosts(req.user._id, {
    type,
    following,
    saved,
    author,
    limit,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    posts,
  });
});

export const getPost = asyncHandler(async (req, res) => {
  const result = await communityService.getPostById(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  await communityService.deletePost(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});

export const toggleLike = asyncHandler(async (req, res) => {
  const post = await communityService.toggleLike(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    post,
  });
});

export const toggleSave = asyncHandler(async (req, res) => {
  const post = await communityService.toggleSave(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    post,
  });
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await communityService.addComment(
    req.params.id,
    req.user._id,
    req.body.content
  );

  res.status(201).json({
    success: true,
    comment,
  });
});

export const toggleCommentUpvote = asyncHandler(async (req, res) => {
  const comment = await communityService.toggleCommentUpvote(
    req.params.commentId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    comment,
  });
});

export const markBestAnswer = asyncHandler(async (req, res) => {
  const post = await communityService.markBestAnswer(
    req.params.id,
    req.user._id,
    req.body.commentId
  );

  res.status(200).json({
    success: true,
    post,
  });
});

export const shareItinerary = asyncHandler(async (req, res) => {
  const post = await communityService.shareItineraryToCommunity(
    req.params.tripId,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: "Itinerary shared to the community",
    post,
  });
});

export const copyItinerary = asyncHandler(async (req, res) => {
  const trip = await communityService.copyItineraryFromPost(req.params.id, req.user._id);

  res.status(201).json({
    success: true,
    message: "Itinerary copied to your trips",
    trip,
  });
});

export const trendingDestinations = asyncHandler(async (req, res) => {
  const destinations = await communityService.getTrendingDestinations();

  res.status(200).json({
    success: true,
    destinations,
  });
});

export const topTravelers = asyncHandler(async (req, res) => {
  const travelers = await communityService.getTopTravelers();

  res.status(200).json({
    success: true,
    travelers,
  });
});
