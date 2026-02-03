"use client";

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

const StatBlock = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) => (
  <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
    <div className="text-[11px] text-muted-foreground">Δ {delta}</div>
  </div>
);

export function ChatMessage({ message, onFollowUp }: ChatMessageProps) {
  const isUser = message.role === "user";
  const summary = message.summary;
  const highlights = message.highlights ?? [];

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[94%] space-y-3", isUser && "items-end")}>
        {isUser ? (
          <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Summary
                  </div>
                  <span>
                    {summary.period.start} → {summary.period.end}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatBlock
                    label="Calories"
                    value={formatValue(summary.totals.calories, "kcal")}
                    delta={formatSigned(summary.deltas.calories, "kcal")}
                  />
                  <StatBlock
                    label="Steps"
                    value={formatValue(summary.totals.steps, "steps")}
                    delta={formatSigned(summary.deltas.steps, "steps")}
                  />
                  <StatBlock
                    label="Workouts"
                    value={formatValue(summary.totals.workouts, "sessions")}
                    delta={formatSigned(summary.deltas.workouts, "sessions")}
                  />
                  <StatBlock
                    label="Weight avg"
                    value={formatValue(summary.totals.weightAvgKg, "kg")}
                    delta={formatSigned(summary.deltas.weightAvgKg, "kg")}
                  />
                </div>
              </div>
            )}

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
                    <li key={highlight} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {!isUser && message.dataUsed && (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer select-none text-[11px] uppercase tracking-wide text-muted-foreground">
              Data used
            </summary>
            <div className="mt-1">
              {message.dataUsed.range.start} → {message.dataUsed.range.end} ·{" "}
              {message.dataUsed.counts.meals} meals · {message.dataUsed.counts.metrics} metrics ·{" "}
              {message.dataUsed.counts.workouts} workouts
            </div>
          </details>
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
