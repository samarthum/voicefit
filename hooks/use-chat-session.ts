"use client";

import { useCallback, useMemo, useState } from "react";
import type { AssistantChatMessage, AssistantChatResponse } from "@/lib/types";

const createId = () => `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useChatSession() {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const addMessage = useCallback((message: AssistantChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<AssistantChatMessage>) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, ...updates } : message))
    );
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: AssistantChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    addMessage(userMessage);

    const assistantMessageId = createId();
    addMessage({
      id: assistantMessageId,
      role: "assistant",
      content: "Thinking…",
      status: "pending",
    });

    setIsSending(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, timezone }),
      });

      const result = (await response.json()) as { success: boolean; data?: AssistantChatResponse; error?: string };
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get assistant response");
      }

      updateMessage(assistantMessageId, {
        content: result.data.headline,
        highlights: result.data.highlights ?? [],
        status: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to respond";
      updateMessage(assistantMessageId, {
        content: message,
        status: "error",
      });
    } finally {
      setIsSending(false);
    }
  }, [addMessage, updateMessage]);

  const resetSession = useCallback(() => {
    setMessages([]);
  }, []);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  return {
    messages,
    hasMessages,
    isSending,
    sendMessage,
    resetSession,
  };
}
