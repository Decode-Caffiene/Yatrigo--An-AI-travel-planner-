import express from "express";
import {
  register,
  login,
  googleLogin,
  forgotPasswordHandler,
  resetPasswordHandler,
  verifyEmailHandler,
  resendVerificationHandler,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login an existing user
router.post("/login", login);

// Login (or register) a user via Google OAuth
router.post("/google", googleLogin);

// Request a password reset email
router.post("/forgot-password", forgotPasswordHandler);

// Reset password using the token emailed by forgot-password
router.post("/reset-password", resetPasswordHandler);

// Verify email using the token emailed by register
router.post("/verify-email", verifyEmailHandler);

// Resend the verification email
router.post("/resend-verification", resendVerificationHandler);

export default router;