"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantChatMessage } from "@/lib/types";

interface ChatMessageProps {
  message: AssistantChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const highlights = message.highlights ?? [];

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[94%] space-y-3", isUser && "items-end")}>
        {isUser ? (
          <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl border border-border/60 bg-muted/50 px-4 py-3 text-foreground",
              message.status === "error" && "border-destructive/50 bg-destructive/10 text-destructive"
            )}
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Coach
            </div>
            <p className="text-sm font-medium leading-relaxed">{message.content}</p>
            {highlights.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2 leading-relaxed">
                    <span className="text-muted-foreground/60">—</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isUser && message.status === "error" && (
          <p className="text-xs text-destructive">Something went wrong. Please try again.</p>
        )}

      </div>
    </div>
  );
}
