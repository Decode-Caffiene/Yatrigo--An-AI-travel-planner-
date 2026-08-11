import express from "express";

import {
  createPost,
  listPosts,
  getPost,
  deletePost,
  toggleLike,
  toggleSave,
  addComment,
  toggleCommentUpvote,
  markBestAnswer,
  shareItinerary,
  copyItinerary,
  trendingDestinations,
  topTravelers,
} from "../controllers/community.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/trending-destinations", trendingDestinations);
router.get("/top-travelers", topTravelers);

router.post("/posts", createPost);
router.get("/posts", listPosts);
router.post("/posts/itinerary/:tripId", shareItinerary);
router.get("/posts/:id", getPost);
router.delete("/posts/:id", deletePost);
router.post("/posts/:id/like", toggleLike);
router.post("/posts/:id/save", toggleSave);
router.post("/posts/:id/comments", addComment);
router.post("/posts/:id/comments/:commentId/upvote", toggleCommentUpvote);
router.post("/posts/:id/best-answer", markBestAnswer);
router.post("/posts/:id/copy-itinerary", copyItinerary);

export default router;
