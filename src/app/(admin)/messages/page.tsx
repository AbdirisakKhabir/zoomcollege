"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ModalOverlayGate } from "@/context/ModalOverlayContext";
import { userDisplayName, userInitials } from "@/lib/chat-utils";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";

type ChatUser = {
  id: number;
  name: string | null;
  email: string;
  role: { name: string };
};

type ConversationItem = {
  id: number;
  otherUser: ChatUser;
  lastMessage: {
    id: number;
    body: string;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

type ChatMessage = {
  id: number;
  body: string;
  senderId: number;
  createdAt: string;
  sender: ChatUser;
};

function Avatar({ user, size = "md" }: { user: ChatUser; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 ${dim}`}
    >
      {userInitials(user)}
    </span>
  );
}

function formatMessageTime(value: string): string {
  const d = new Date(value);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("c")) || null;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef(0);

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const fetchConversations = useCallback(async () => {
    const res = await authFetch("/api/chat/conversations");
    if (res.ok) setConversations(await res.json());
    setLoadingList(false);
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: number, initial = false) => {
      if (initial) setLoadingMessages(true);
      const afterId = initial ? 0 : lastMessageIdRef.current;
      const params = new URLSearchParams({ limit: "100" });
      if (afterId > 0) params.set("afterId", String(afterId));

      const res = await authFetch(`/api/chat/conversations/${conversationId}?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (initial) {
          setMessages(data.messages);
        } else if (data.messages.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const next = [...prev];
            for (const m of data.messages as ChatMessage[]) {
              if (!ids.has(m.id)) next.push(m);
            }
            return next;
          });
        }
        const last = (data.messages as ChatMessage[]).at(-1);
        if (last) lastMessageIdRef.current = last.id;
      }
      if (initial) setLoadingMessages(false);
    },
    []
  );

  const markRead = useCallback(async (conversationId: number) => {
    await authFetch(`/api/chat/conversations/${conversationId}`, { method: "PATCH" });
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const openConversation = useCallback(
    (conversationId: number) => {
      router.push(`/messages?c=${conversationId}`);
    },
    [router]
  );

  const startConversation = async (targetUserId: number) => {
    const res = await authFetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });
    if (res.ok) {
      const conv = await res.json();
      await fetchConversations();
      setShowNewChat(false);
      setContactQuery("");
      setContacts([]);
      openConversation(conv.id);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 12000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      lastMessageIdRef.current = 0;
      return;
    }

    lastMessageIdRef.current = 0;
    fetchMessages(selectedId, true);
    markRead(selectedId);

    const interval = setInterval(() => {
      fetchMessages(selectedId, false);
      markRead(selectedId);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedId, fetchMessages, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const q = contactQuery.trim();
    if (!showNewChat) return;
    const timer = setTimeout(async () => {
      setContactsLoading(true);
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await authFetch(`/api/chat/contacts${params}`);
      if (res.ok) setContacts(await res.json());
      setContactsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactQuery, showNewChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/chat/conversations/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
        lastMessageIdRef.current = message.id;
        setDraft("");
        fetchConversations();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadCrumb pageTitle="Messages" />
        <Button size="sm" onClick={() => setShowNewChat(true)}>
          New Message
        </Button>
      </div>

      <div className="flex h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        {/* Conversation list */}
        <aside
          className={`flex w-full flex-col border-r border-gray-200 dark:border-gray-800 md:w-80 lg:w-96 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No conversations yet. Start a new message.
              </p>
            ) : (
              conversations.map((conv) => {
                const active = conv.id === selectedId;
                const preview = conv.lastMessage?.body ?? "No messages yet";
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openConversation(conv.id)}
                    className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 ${
                      active ? "bg-brand-50/60 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <Avatar user={conv.otherUser} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {userDisplayName(conv.otherUser)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">{preview}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Message thread */}
        <section
          className={`min-w-0 flex-1 flex-col ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
              <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-sm">Select a conversation or start a new message</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => router.push("/messages")}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden dark:hover:bg-white/5"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Avatar user={selectedConversation.otherUser} />
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">
                    {userDisplayName(selectedConversation.otherUser)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.otherUser.role.name} ·{" "}
                    {selectedConversation.otherUser.email}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">No messages yet. Say hello!</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const mine = m.senderId === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                              mine
                                ? "rounded-br-md bg-brand-500 text-white"
                                : "rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                mine ? "text-white/70" : "text-gray-400"
                              }`}
                            >
                              {formatMessageTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  rows={2}
                  placeholder="Type a message…"
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700"
                />
                <Button type="submit" size="sm" disabled={!draft.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      {showNewChat && (
        <ModalOverlayGate>
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  New Message
                </h3>
                <input
                  type="text"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Search users by name or email…"
                  className="mt-3 h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {contactsLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
                ) : contacts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">No users found</p>
                ) : (
                  contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => startConversation(c.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <Avatar user={c} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {userDisplayName(c)}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {c.role.name} · {c.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
                <Button variant="outline" size="sm" onClick={() => setShowNewChat(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </ModalOverlayGate>
      )}
    </>
  );
}
