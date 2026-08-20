import multer from "multer";

import AppError from "../utils/AppError.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new AppError("Only image uploads are allowed.", 400));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// Chat attachments accept any file type (documents, gifs, etc.), so this
// instance skips the image-only filter and allows a larger size limit.
export const uploadAny = multer({
  storage,
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
});

export default upload;
