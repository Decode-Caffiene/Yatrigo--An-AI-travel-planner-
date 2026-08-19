import crypto from "crypto";

import axios from "axios";

import User from "../models/user.model.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateToken } from "../utils/jwt.js";
import { sendEmail } from "../utils/email.js";
import AppError from "../utils/AppError.js";
import {
  isValidGmailAddress,
  isValidPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "../utils/validators.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sendVerificationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  user.emailVerificationToken = hashResetToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();

  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Yatrigo email",
    html: `
      <p>Hi ${user.name},</p>
      <p>Click the link below to verify your email and activate your Yatrigo account. This link expires in 24 hours.</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    `,
  });
};

/**
 * Register User
 */
export const registerUser = async ({ name, email, password }) => {
  if (!isValidGmailAddress(email)) {
    throw new AppError("Only Gmail addresses (e.g. name@gmail.com) are allowed to register", 400);
  }

  if (!isValidPassword(password)) {
    throw new AppError(PASSWORD_REQUIREMENTS_MESSAGE, 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User already exists", 409);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user — unverified until they click the emailed link
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    isEmailVerified: false,
  });

  await sendVerificationEmail(user);

  return {
    message: "Account created. Check your email to verify your account before logging in.",
  };
};

/**
 * Login User
 */
export const loginUser = async ({ email, password }) => {
  // Find user
  const user = await User.findOne({ email });

  if (!user || !user.password) {
    throw new AppError("Invalid email or password", 401);
  }

  // Compare password
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Please verify your email before logging in. Check your inbox for the verification link.",
      403
    );
  }

  // Generate JWT
  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  };
};

/**
 * Verify a user's email using the token emailed by registerUser, then log
 * them in immediately so they land straight on their homepage.
 */
export const verifyEmail = async ({ token }) => {
  if (!token) {
    throw new AppError("Token is required", 400);
  }

  const user = await User.findOne({
    emailVerificationToken: hashResetToken(token),
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Invalid or expired verification link", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  const jwt = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token: jwt,
  };
};

/**
 * Resend the verification email. Always resolves without revealing
 * whether the email is registered, to avoid leaking account existence.
 */
export const resendVerification = async ({ email }) => {
  const user = await User.findOne({ email });

  if (user && !user.isEmailVerified) {
    await sendVerificationEmail(user);
  }

  return {
    message: "If that account needs verifying, a new link has been sent.",
  };
};

/**
 * Request a password reset email. Always resolves without revealing
 * whether the email is registered, to avoid leaking account existence.
 */
export const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Yatrigo password",
      html: `
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your Yatrigo password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  return {
    message: "If an account exists for that email, a reset link has been sent.",
  };
};

/**
 * Reset a user's password using the token emailed by forgotPassword
 */
export const resetPassword = async ({ token, password }) => {
  if (!token || !password) {
    throw new AppError("Token and new password are required", 400);
  }

  if (!isValidPassword(password)) {
    throw new AppError(PASSWORD_REQUIREMENTS_MESSAGE, 400);
  }

  const user = await User.findOne({
    resetPasswordToken: hashResetToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset link", 400);
  }

  user.password = await hashPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { message: "Password reset successful" };
};

/**
 * Login (or register) a user via a Google OAuth access token
 * (obtained from the Google Identity Services popup consent flow)
 */
export const loginWithGoogle = async ({ accessToken }) => {
  if (!accessToken) {
    throw new AppError("Google access token is required", 400);
  }

  let payload;

  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    payload = data;
  } catch {
    throw new AppError("Invalid Google token", 401);
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new AppError("Google email is not verified", 401);
  }

  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email: payload.email }],
  });

  if (!user) {
    // Google already confirmed ownership of this email (checked above),
    // so there's nothing left for our own verification email to prove.
    user = await User.create({
      name: payload.name || payload.email,
      email: payload.email,
      googleId: payload.sub,
      isEmailVerified: true,
    });
  } else {
    let changed = false;

    if (!user.googleId) {
      user.googleId = payload.sub;
      changed = true;
    }

    // Linking a verified Google account to a pre-existing, still-unverified
    // email/password account is itself proof of ownership.
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      changed = true;
    }

    if (changed) await user.save();
  }

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  };
};