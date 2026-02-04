"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AskCoachCardProps {
  onOpen: (prompt?: string, autoSend?: boolean) => void;
}

export function AskCoachCard({ onOpen }: AskCoachCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/70">
      <div className="absolute -top-16 right-4 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-8 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <CardContent className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary-strong" />
              Coach
            </div>
            <h3 className="mt-2 text-lg font-display text-foreground">
              Ask about your progress
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Read‑only insights from your last 7 days.
            </p>
          </div>
          <Button onClick={() => onOpen()} size="sm" className="shrink-0">
            Ask Coach
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            "Summarize my week",
            "Calorie trend",
            "Workout consistency",
            "Weight change",
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onOpen(tag, true)}
              className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
            >
              {tag}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
