import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Required unless the message has been deleted — a deleted message's
    // text is cleared from the DB entirely, not just hidden in the API.
    text: {
      type: String,
      required: function () {
        return !this.deleted;
      },
      trim: true,
      maxlength: 4000,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
