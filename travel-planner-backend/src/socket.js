import { Server } from "socket.io";

import { verifyToken } from "./utils/jwt.js";
import User from "./models/user.model.js";

let io = null;

/**
 * One Socket.IO room per userId — a user's chat messages get pushed to
 * every tab/device they have open without the server needing to track
 * individual socket ids.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("No token provided");

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select("_id");
      if (!user) throw new Error("User not found");

      socket.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(socket.userId);

    // Typing indicators are purely ephemeral (never stored) — the client
    // already knows the other participant's id, so this just relays
    // directly to their room instead of looking up the conversation.
    const relayTyping = (isTyping, { conversationId, recipientId } = {}) => {
      if (!conversationId || !recipientId) return;
      socket.to(recipientId).emit("typing", {
        conversationId,
        userId: socket.userId,
        isTyping,
      });
    };

    socket.on("typing:start", (payload) => relayTyping(true, payload));
    socket.on("typing:stop", (payload) => relayTyping(false, payload));
  });

  return io;
};

export const getIO = () => io;
