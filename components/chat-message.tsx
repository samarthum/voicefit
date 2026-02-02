"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantChatMessage } from "@/lib/types";

interface ChatMessageProps {
  message: AssistantChatMessage;
  onFollowUp?: (prompt: string) => void;
}

const formatSigned = (value: number | null, suffix: string) => {
  if (value === null || Number.isNaN(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  const absolute = Math.abs(value);
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : absolute < 10
    ? value.toFixed(1)
    : Math.round(value).toLocaleString();
  return `${sign}${formatted} ${suffix}`.trim();
};

const formatValue = (value: number | null, suffix: string) => {
  if (value === null || Number.isNaN(value)) return "n/a";
  const rounded = Number.isInteger(value)
    ? value.toLocaleString()
    : Math.abs(value) < 10
    ? value.toFixed(1)
    : Math.round(value).toLocaleString();
  return `${rounded} ${suffix}`.trim();
};

export function ChatMessage({ message, onFollowUp }: ChatMessageProps) {
  const isUser = message.role === "user";
  const summary = message.summary;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[90%] space-y-3", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/60 bg-muted/50 text-foreground",
            message.status === "error" && "border-destructive/50 bg-destructive/10 text-destructive"
          )}
        >
          {!isUser && (
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Coach
            </div>
          )}
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed text-foreground">{children}</p>
                ),
                strong: ({ children }) => (
                  <span className="text-base font-medium text-foreground">{children}</span>
                ),
                ul: ({ children }) => (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span>{children}</span>
                  </li>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && summary && (
          <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Summary · {summary.period.start} → {summary.period.end}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Calories</div>
                <div className="text-foreground font-medium">
                  {formatValue(summary.totals.calories, "kcal")}
                </div>
                <div className="text-muted-foreground">Δ {formatSigned(summary.deltas.calories, "kcal")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Steps</div>
                <div className="text-foreground font-medium">
                  {formatValue(summary.totals.steps, "steps")}
                </div>
                <div className="text-muted-foreground">Δ {formatSigned(summary.deltas.steps, "steps")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Workouts</div>
                <div className="text-foreground font-medium">
                  {formatValue(summary.totals.workouts, "sessions")}
                </div>
                <div className="text-muted-foreground">Δ {formatSigned(summary.deltas.workouts, "sessions")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Weight avg</div>
                <div className="text-foreground font-medium">
                  {formatValue(summary.totals.weightAvgKg, "kg")}
                </div>
                <div className="text-muted-foreground">Δ {formatSigned(summary.deltas.weightAvgKg, "kg")}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">Weight change (period)</div>
                <div className="text-foreground font-medium">
                  {formatValue(summary.totals.weightChangeKg, "kg")}
                </div>
                <div className="text-muted-foreground">
                  Δ {formatSigned(summary.deltas.weightChangeKg, "kg")}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isUser && message.dataUsed && (
          <div className="text-[11px] text-muted-foreground">
            Data used: {message.dataUsed.range.start} → {message.dataUsed.range.end} ·{" "}
            {message.dataUsed.counts.meals} meals · {message.dataUsed.counts.metrics} metrics ·{" "}
            {message.dataUsed.counts.workouts} workouts
          </div>
        )}

        {!isUser && message.followUps && message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.followUps.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onFollowUp?.(prompt)}
                className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
