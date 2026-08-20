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
    // Required unless the message has been deleted or carries an attachment
    // instead (or alongside one, as a caption) — a deleted message's text is
    // cleared from the DB entirely, not just hidden in the API.
    text: {
      type: String,
      required: function () {
        return !this.deleted && !this.attachment;
      },
      trim: true,
      maxlength: 4000,
    },
    attachment: {
      // Nested field can't be named "type" — Mongoose's `{ type: {...} }`
      // nested-object shorthand collides with a subfield of the same name
      // and misparses the whole schema. Stored as attachmentType, mapped
      // to/from the public "type" field in message.service.js.
      type: {
        url: { type: String, required: true },
        attachmentType: { type: String, enum: ["image", "file"], required: true },
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
      required: false,
      default: undefined,
    },
    deleted: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
