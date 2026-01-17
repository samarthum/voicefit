"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationItem, type ConversationFeedEvent } from "@/components/conversation-item";

interface ConversationFeedProps {
  events: ConversationFeedEvent[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ConversationFeed({
  events,
  isLoading = false,
  hasMore = false,
  onLoadMore,
}: ConversationFeedProps) {
  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No entries yet. Log something to start your conversation.
        </div>
      ) : (
        events.map((event) => <ConversationItem key={event.id} event={event} />)
      )}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
