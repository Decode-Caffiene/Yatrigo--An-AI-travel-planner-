import cloudinary from "../config/cloudinary.js";
import AppError from "../utils/AppError.js";

export const uploadImageBuffer = (buffer) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    throw new AppError(
      "Image uploads are not configured yet (missing Cloudinary credentials).",
      500
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "yatrigo", resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("Image upload failed.", 502));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};
