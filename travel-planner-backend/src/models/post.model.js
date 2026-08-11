import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    budget: { type: Number, min: 0 },
    bestTimeToVisit: { type: String, trim: true },
    pros: [{ type: String, trim: true }],
    cons: [{ type: String, trim: true }],
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["story", "review", "question", "itinerary"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    images: [{ type: String }],

    destination: {
      type: String,
      trim: true,
    },

    travelType: {
      type: String,
      enum: ["solo", "family", "couple", "friends"],
    },

    visitedDate: {
      type: Date,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    review: reviewSchema,

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },

    // Denormalized copy of Trip.itinerary at share time, so a shared post
    // stays stable even if the original trip's itinerary is later regenerated.
    itinerarySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    saves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    commentCount: {
      type: Number,
      default: 0,
    },

    bestAnswerComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
