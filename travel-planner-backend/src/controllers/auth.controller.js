import asyncHandler from "../utils/asyncHandler.js";
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    ...result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    ...result,
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const result = await loginWithGoogle(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    ...result,
  });
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const result = await forgotPassword(req.body);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const result = await resetPassword(req.body);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const result = await verifyEmail(req.body);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  const result = await resendVerification(req.body);

  res.status(200).json({
    success: true,
    ...result,
  });
});
