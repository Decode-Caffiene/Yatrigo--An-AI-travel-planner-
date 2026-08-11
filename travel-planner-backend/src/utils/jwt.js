import jwt from "jsonwebtoken";

/**
 * Generate JWT Token
 * @param {string} userId
 * @returns {string}
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/**
 * Verify JWT Token
 * @param {string} token
 * @returns {object}
 */
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};