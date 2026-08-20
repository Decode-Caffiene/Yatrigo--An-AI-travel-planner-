import express from "express";

import { uploadFile, uploadImage } from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload, { uploadAny } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/image", protect, upload.single("image"), uploadImage);
router.post("/file", protect, uploadAny.single("file"), uploadFile);

export default router;
