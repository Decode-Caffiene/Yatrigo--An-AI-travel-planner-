import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { translateText } from "../services/translate.service.js";

export const translate = asyncHandler(async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    throw new AppError("text and targetLanguage are required.", 400);
  }

  const translated = await translateText(text, targetLanguage);

  res.status(200).json({
    success: true,
    targetLanguage,
    translated,
  });
});
