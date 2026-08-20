import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { uploadFileBuffer, uploadImageBuffer } from "../services/upload.service.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No image file was provided.", 400);
  }

  const url = await uploadImageBuffer(req.file.buffer);

  res.status(201).json({
    success: true,
    url,
  });
});

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file was provided.", 400);
  }

  const url = await uploadFileBuffer(req.file.buffer);

  res.status(201).json({
    success: true,
    url,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});
