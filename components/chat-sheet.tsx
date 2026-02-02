"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useChatSession } from "@/hooks/use-chat-session";

interface ChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string | null;
}

const PROMPT_STARTERS = [
  "Summarize my last 7 days",
  "How are my calories trending?",
  "Any changes in my weight this week?",
  "How consistent were my workouts?",
];

const QUICK_ACTIONS = [
  { label: "Log meal", href: "/meals" },
  { label: "Log workout", href: "/workouts/new" },
  { label: "Log steps", href: "/metrics" },
  { label: "Log weight", href: "/metrics" },
];

export function ChatSheet({ open, onOpenChange, initialPrompt }: ChatSheetProps) {
  const router = useRouter();
  const { messages, hasMessages, isSending, sendMessage, resetSession } =
    useChatSession();
  const [draft, setDraft] = useState(initialPrompt ?? "");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && initialPrompt) {
      setDraft(initialPrompt);
    }
  }, [open, initialPrompt]);

  useEffect(() => {
    if (!open) {
      resetSession();
      setDraft("");
    }
  }, [open, resetSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    await sendMessage(message);
  };

  const emptyState = useMemo(
    () => (
      <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <Sparkles className="h-4 w-4" />
          Coach overview
        </div>
        <p>Ask about trends, progress, or consistency. I’ll use your last 7 days of data.</p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            Calories, steps, workouts, weight summaries
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            Deltas vs the previous 7 days
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            Light coach tone, no data changes
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROMPT_STARTERS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setDraft(prompt)}
              className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    ),
    []
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-md sm:w-[420px]",
          "px-0 py-0"
        )}
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/60 px-5 pb-3 pt-6">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Coach
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Read‑only insights from your recent logs
            </p>
          </SheetHeader>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
          >
            {hasMessages ? (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onFollowUp={(prompt) => setDraft(prompt)}
                />
              ))
            ) : (
              emptyState
            )}
          </div>

          <div className="border-t border-border/60 px-5 py-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    router.push(action.href);
                    onOpenChange(false);
                  }}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              disabled={isSending}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
