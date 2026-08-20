"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/lib/auth-context";
import {
  getUnreadMessageCount,
  getUnreadNotificationCount,
  SOCKET_URL,
} from "@/lib/api";
import type { AppNotification, ChatMessage } from "@/types";

export interface MessageDeletedEvent {
  conversationId: string;
  messageId: string;
}

export interface ReadReceiptEvent {
  conversationId: string;
  readerId: string;
  readAt: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

type MessageListener = (message: ChatMessage) => void;
type MessageEditedListener = (message: ChatMessage) => void;
type MessageDeletedListener = (event: MessageDeletedEvent) => void;
type ReadReceiptListener = (event: ReadReceiptEvent) => void;
type TypingListener = (event: TypingEvent) => void;
type NotificationListener = (notification: AppNotification) => void;

interface ChatContextValue {
  unreadCount: number;
  refreshUnreadCount: () => void;
  subscribe: (listener: MessageListener) => () => void;
  subscribeToMessageEdits: (listener: MessageEditedListener) => () => void;
  subscribeToMessageDeletions: (listener: MessageDeletedListener) => () => void;
  subscribeToReadReceipts: (listener: ReadReceiptListener) => () => void;
  subscribeToTyping: (listener: TypingListener) => () => void;
  emitTyping: (conversationId: string, recipientId: string, isTyping: boolean) => void;

  unreadNotificationCount: number;
  refreshUnreadNotificationCount: () => void;
  subscribeToNotifications: (listener: NotificationListener) => () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * One Socket.IO connection shared by the whole app (Navbar badges + the
 * Messages page + the notification bell) instead of each screen opening its
 * own. New events are broadcast to subscribers via plain listener sets
 * rather than more React context state, so the active conversation view or
 * an open notification dropdown can append to its own list without every
 * screen re-rendering on every event.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const listenersRef = useRef(new Set<MessageListener>());
  const editListenersRef = useRef(new Set<MessageEditedListener>());
  const deletionListenersRef = useRef(new Set<MessageDeletedListener>());
  const readReceiptListenersRef = useRef(new Set<ReadReceiptListener>());
  const typingListenersRef = useRef(new Set<TypingListener>());
  const notificationListenersRef = useRef(new Set<NotificationListener>());
  const socketRef = useRef<Socket | null>(null);

  const refreshUnreadCount = () => {
    if (!token) return;
    getUnreadMessageCount(token)
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  };

  const refreshUnreadNotificationCount = () => {
    if (!token) return;
    getUnreadNotificationCount(token)
      .then((res) => setUnreadNotificationCount(res.count))
      .catch(() => {});
  };

  useEffect(() => {
    if (!token || !user) return;

    const socket: Socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("message:new", (message: ChatMessage) => {
      listenersRef.current.forEach((listener) => listener(message));
      refreshUnreadCount();
    });

    socket.on("message:edited", (message: ChatMessage) => {
      editListenersRef.current.forEach((listener) => listener(message));
    });

    socket.on("message:deleted", (event: MessageDeletedEvent) => {
      deletionListenersRef.current.forEach((listener) => listener(event));
    });

    socket.on("conversation:read", (event: ReadReceiptEvent) => {
      readReceiptListenersRef.current.forEach((listener) => listener(event));
    });

    socket.on("typing", (event: TypingEvent) => {
      typingListenersRef.current.forEach((listener) => listener(event));
    });

    socket.on("notification:new", (notification: AppNotification) => {
      notificationListenersRef.current.forEach((listener) => listener(notification));
      refreshUnreadNotificationCount();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  useEffect(() => {
    refreshUnreadCount();
    refreshUnreadNotificationCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const subscribe = (listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  };

  const subscribeToMessageEdits = (listener: MessageEditedListener) => {
    editListenersRef.current.add(listener);
    return () => editListenersRef.current.delete(listener);
  };

  const subscribeToMessageDeletions = (listener: MessageDeletedListener) => {
    deletionListenersRef.current.add(listener);
    return () => deletionListenersRef.current.delete(listener);
  };

  const subscribeToReadReceipts = (listener: ReadReceiptListener) => {
    readReceiptListenersRef.current.add(listener);
    return () => readReceiptListenersRef.current.delete(listener);
  };

  const subscribeToTyping = (listener: TypingListener) => {
    typingListenersRef.current.add(listener);
    return () => typingListenersRef.current.delete(listener);
  };

  const emitTyping = (conversationId: string, recipientId: string, isTyping: boolean) => {
    socketRef.current?.emit(isTyping ? "typing:start" : "typing:stop", {
      conversationId,
      recipientId,
    });
  };

  const subscribeToNotifications = (listener: NotificationListener) => {
    notificationListenersRef.current.add(listener);
    return () => notificationListenersRef.current.delete(listener);
  };

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        subscribe,
        subscribeToMessageEdits,
        subscribeToMessageDeletions,
        subscribeToReadReceipts,
        subscribeToTyping,
        emitTyping,
        unreadNotificationCount,
        refreshUnreadNotificationCount,
        subscribeToNotifications,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
