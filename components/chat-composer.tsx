"use client";

import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatComposer({ value, onChange, onSend, disabled }: ChatComposerProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about calories, workouts, or trends..."
        className="min-h-[72px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Read‑only coach</span>
        <Button
          size="sm"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={cn(disabled && "opacity-60")}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
