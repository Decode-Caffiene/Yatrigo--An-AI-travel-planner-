import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 8,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    // Defaults to true so accounts created before this field existed read
    // as already verified (Mongoose applies schema defaults in memory for
    // fields missing from the stored document) — only new email/password
    // registrations explicitly set this to false.
    isEmailVerified: {
      type: Boolean,
      default: true,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationExpires: {
      type: Date,
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      default: null,
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;