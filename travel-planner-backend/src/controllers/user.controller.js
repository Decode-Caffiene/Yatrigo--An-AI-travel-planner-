import asyncHandler from "../utils/asyncHandler.js";
import * as userService from "../services/user.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getUserProfile(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    profile,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await userService.updateProfile(req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    profile,
  });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await userService.searchUsers(req.query.query, req.user._id);

  res.status(200).json({
    success: true,
    users,
  });
});

export const toggleFollow = asyncHandler(async (req, res) => {
  const result = await userService.toggleFollow(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    ...result,
  });
});
