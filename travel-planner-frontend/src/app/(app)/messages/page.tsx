"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useChat } from "@/lib/chat-context";
import { Avatar } from "@/components/Avatar";
import {
  ApiError,
  deleteMessage,
  getMessages,
  listConversations,
  markConversationRead,
  searchUsers,
  sendMessage,
  startConversation,
} from "@/lib/api";
import type { ChatMessage, ChatUser, Conversation } from "@/types";

const TYPING_STOP_DELAY_MS = 2000;
const TYPING_AUTO_CLEAR_MS = 4000;

function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatConversationTime(dateString: string) {
  const date = new Date(dateString);
  const isToday = date.toDateString() === new Date().toDateString();

  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MessagesContent() {
  const { isReady } = useRequireAuth();
  const { token, user } = useAuth();
  const {
    subscribe,
    subscribeToMessageDeletions,
    subscribeToReadReceipts,
    subscribeToTyping,
    emitTyping,
    refreshUnreadCount,
  } = useChat();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeConversationId = searchParams.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typingAutoClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadConversations = () => {
    if (!token) return;
    listConversations(token)
      .then((res) => setConversations(res.conversations))
      .catch((err) =>
        setConversationsError(
          err instanceof ApiError ? err.message : "Failed to load conversations."
        )
      )
      .finally(() => setIsLoadingConversations(false));
  };

  useEffect(() => {
    if (!isReady || !token) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOtherTyping(false);
    clearTimeout(typingAutoClearRef.current);

    if (!isReady || !token || !activeConversationId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    setMessagesError(null);

    getMessages(token, activeConversationId)
      .then((res) => setMessages(res.messages))
      .catch((err) =>
        setMessagesError(
          err instanceof ApiError ? err.message : "Failed to load messages."
        )
      )
      .finally(() => setIsLoadingMessages(false));

    markConversationRead(token, activeConversationId)
      .then(() => {
        refreshUnreadCount();
        setConversations((current) =>
          current.map((c) =>
            c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
          )
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, token, activeConversationId]);

  useEffect(() => {
    if (!token || !user) return;

    return subscribe((message) => {
      if (message.conversationId === activeConversationId) {
        setMessages((current) =>
          current.some((m) => m.id === message.id) ? current : [...current, message]
        );
        markConversationRead(token, message.conversationId).then(refreshUnreadCount);
      }

      setConversations((current) => {
        const exists = current.some((c) => c.id === message.conversationId);
        if (!exists) {
          // A brand-new conversation someone else just started with us —
          // simplest correct handling is to refetch the list so we get its
          // otherUser info, rather than trying to construct it from the
          // message payload alone.
          loadConversations();
          return current;
        }

        const updated = current.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: {
                  text: message.text,
                  senderId: message.senderId,
                  createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
                unreadCount:
                  message.conversationId === activeConversationId ||
                  message.senderId === user.id
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c
        );

        return [...updated].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, activeConversationId]);

  useEffect(() => {
    return subscribeToMessageDeletions((event) => {
      if (event.conversationId === activeConversationId) {
        setMessages((current) =>
          current.map((m) =>
            m.id === event.messageId ? { ...m, deleted: true, text: null } : m
          )
        );
      }

      // The conversation list preview may have shown the now-deleted
      // message — simplest correct fix is to refetch it rather than try to
      // reconstruct "the message before that one" on the client.
      loadConversations();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, subscribeToMessageDeletions]);

  useEffect(() => {
    return subscribeToReadReceipts((event) => {
      setConversations((current) =>
        current.map((c) =>
          c.id === event.conversationId && c.otherUser
            ? { ...c, otherUser: { ...c.otherUser, lastReadAt: event.readAt } }
            : c
        )
      );
    });
  }, [subscribeToReadReceipts]);

  useEffect(() => {
    return subscribeToTyping((event) => {
      if (event.conversationId !== activeConversationId) return;

      setIsOtherTyping(event.isTyping);
      clearTimeout(typingAutoClearRef.current);
      if (event.isTyping) {
        // Safety net in case a "stop" event never arrives (closed tab, lost
        // connection) — the indicator shouldn't get stuck on forever.
        typingAutoClearRef.current = setTimeout(
          () => setIsOtherTyping(false),
          TYPING_AUTO_CLEAR_MS
        );
      }
    });
  }, [activeConversationId, subscribeToTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activeConversationId, isOtherTyping]);

  useEffect(() => {
    if (!token || !isSearchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      searchUsers(token, q)
        .then((res) => setSearchResults(res.users))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [token, isSearchOpen, searchQuery]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  // The most recent message I sent in this conversation — used to show a
  // "Seen" receipt once the other participant's lastReadAt passes it.
  const lastOwnMessage = useMemo(
    () => [...messages].reverse().find((m) => m.senderId === user?.id) ?? null,
    [messages, user]
  );
  const lastOwnMessageSeen = !!(
    lastOwnMessage &&
    activeConversation?.otherUser?.lastReadAt &&
    new Date(activeConversation.otherUser.lastReadAt).getTime() >=
      new Date(lastOwnMessage.createdAt).getTime()
  );

  if (!isReady) return null;

  const openConversation = (conversationId: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.replace(`/messages?c=${conversationId}`);
  };

  const handleStartConversation = async (targetUserId: string) => {
    if (!token) return;
    const res = await startConversation(token, targetUserId);
    loadConversations();
    openConversation(res.conversation.id);
  };

  const stopTyping = () => {
    clearTimeout(typingStopTimeoutRef.current);
    if (activeConversationId && activeConversation?.otherUser) {
      emitTyping(activeConversationId, activeConversation.otherUser.id, false);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!activeConversationId || !activeConversation?.otherUser) return;

    emitTyping(activeConversationId, activeConversation.otherUser.id, true);
    clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY_MS);
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!token || !activeConversationId || !text || isSending) return;

    setIsSending(true);
    setDraft("");
    stopTyping();

    try {
      const res = await sendMessage(token, activeConversationId, text);
      setMessages((current) =>
        current.some((m) => m.id === res.message.id) ? current : [...current, res.message]
      );
      setConversations((current) => {
        const updated = current.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessage: {
                  text: res.message.text,
                  senderId: res.message.senderId,
                  createdAt: res.message.createdAt,
                },
                updatedAt: res.message.createdAt,
              }
            : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    } catch (err) {
      setMessagesError(err instanceof ApiError ? err.message : "Could not send message.");
      setDraft(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!token || !activeConversationId) return;

    setMessages((current) =>
      current.map((m) => (m.id === messageId ? { ...m, deleted: true, text: null } : m))
    );

    try {
      await deleteMessage(token, activeConversationId, messageId);
      loadConversations();
    } catch (err) {
      setMessagesError(
        err instanceof ApiError ? err.message : "Could not delete message."
      );
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest card-shadow">
      {/* Conversation list */}
      <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-surface-variant">
        <div className="flex items-center justify-between border-b border-surface-variant p-4">
          <h1 className="font-headline-md text-headline-md text-on-surface">Messages</h1>
          <button
            type="button"
            onClick={() => setIsSearchOpen((open) => !open)}
            title="New message"
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined">
              {isSearchOpen ? "close" : "edit_square"}
            </span>
          </button>
        </div>

        {isSearchOpen && (
          <div className="border-b border-surface-variant p-3">
            <input
              autoFocus
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none"
            />

            {isSearching && (
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                Searching...
              </p>
            )}

            {!isSearching && searchResults.length > 0 && (
              <ul className="mt-2 space-y-1">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleStartConversation(result.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface-container"
                    >
                      <Avatar name={result.name} avatar={result.avatar} size={32} />
                      <span className="truncate font-body-sm text-body-sm text-on-surface">
                        {result.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-container" />
              ))}
            </div>
          )}

          {conversationsError && !isLoadingConversations && (
            <p className="p-4 font-body-sm text-body-sm text-error">{conversationsError}</p>
          )}

          {!isLoadingConversations && !conversationsError && conversations.length === 0 && (
            <p className="p-4 font-body-sm text-body-sm text-on-surface-variant">
              No conversations yet. Tap the pencil to message someone.
            </p>
          )}

          {!isLoadingConversations && conversations.length > 0 && (
            <ul>
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                    className={`flex w-full items-center gap-2.5 border-b border-surface-variant/50 p-3 text-left transition-colors hover:bg-surface-container ${
                      conversation.id === activeConversationId ? "bg-surface-container" : ""
                    }`}
                  >
                    <Avatar
                      name={conversation.otherUser?.name ?? "?"}
                      avatar={conversation.otherUser?.avatar ?? null}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-body-sm font-semibold text-body-sm text-on-surface">
                          {conversation.otherUser?.name ?? "Unknown user"}
                        </p>
                        {conversation.lastMessage && (
                          <span className="shrink-0 font-body-sm text-[11px] text-on-surface-variant">
                            {formatConversationTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                          {conversation.id === activeConversationId && isOtherTyping ? (
                            <span className="text-primary">typing...</span>
                          ) : conversation.lastMessage ? (
                            (conversation.lastMessage.text ?? "Message deleted")
                          ) : (
                            "Say hello \u{1F44B}"
                          )}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-label-caps text-[11px] text-on-primary">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Active thread */}
      <section className="flex flex-1 flex-col">
        {!activeConversationId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant">
              chat_bubble
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Select a conversation to start chatting
            </p>
          </div>
        )}

        {activeConversationId && (
          <>
            <div className="flex items-center gap-2.5 border-b border-surface-variant p-4">
              {activeConversation?.otherUser ? (
                <Link
                  href={`/community/u/${activeConversation.otherUser.id}`}
                  className="flex items-center gap-2.5"
                >
                  <Avatar
                    name={activeConversation.otherUser.name}
                    avatar={activeConversation.otherUser.avatar}
                    size={32}
                  />
                  <div>
                    <p className="font-body-md font-semibold text-body-md text-on-surface hover:underline">
                      {activeConversation.otherUser.name}
                    </p>
                    {isOtherTyping && (
                      <p className="font-body-sm text-[11px] text-primary">typing...</p>
                    )}
                  </div>
                </Link>
              ) : (
                <span className="font-body-md font-semibold text-body-md text-on-surface">
                  Conversation
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingMessages && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Loading messages...
                </p>
              )}

              {!isLoadingMessages && messages.length === 0 && !messagesError && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No messages yet. Say hello!
                </p>
              )}

              <div className="flex flex-col gap-2">
                {messages.map((message) => {
                  const isMine = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`group flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      {isMine && !message.deleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Delete message"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-base text-on-surface-variant hover:text-error">
                            delete
                          </span>
                        </button>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                          message.deleted
                            ? "border border-dashed border-surface-variant bg-transparent"
                            : isMine
                              ? "rounded-br-sm bg-primary text-on-primary"
                              : "rounded-bl-sm bg-surface-container text-on-surface"
                        }`}
                      >
                        <p
                          className={`whitespace-pre-wrap wrap-break-word font-body-sm text-body-sm ${
                            message.deleted ? "italic text-on-surface-variant" : ""
                          }`}
                        >
                          {message.deleted ? "This message was deleted" : message.text}
                        </p>
                        <p
                          className={`mt-0.5 text-right text-[10px] ${
                            !message.deleted && isMine
                              ? "text-on-primary/70"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {lastOwnMessage && (
                  <p className="pr-1 text-right font-body-sm text-[11px] text-on-surface-variant">
                    {lastOwnMessageSeen ? "Seen" : "Sent"}
                  </p>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {messagesError && (
              <p className="px-4 pb-1 font-body-sm text-body-sm text-error">{messagesError}</p>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-surface-variant p-3"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-surface-variant bg-surface-container-lowest px-4 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
