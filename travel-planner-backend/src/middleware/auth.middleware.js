import User from "../models/user.model.js";
import { verifyToken } from "../utils/jwt.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  // Get Authorization Header
  const authHeader = req.headers.authorization;

  // Check if header exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Access denied. No token provided.", 401);
  }

  // Extract token
  const token = authHeader.split(" ")[1];

  // Verify token
  const decoded = verifyToken(token);

  // Find user
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw new AppError("User not found.", 401);
  }

  // Attach user to request
  req.user = user;

  // Continue
  next();
});