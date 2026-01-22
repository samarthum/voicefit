"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface WorkoutSessionCardProps {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  setCount: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkoutSessionCard({
  id,
  title,
  startedAt,
  endedAt,
  setCount,
  onEdit,
  onDelete,
}: WorkoutSessionCardProps) {
  const startDate = new Date(startedAt);
  const timeAgo = formatDistanceToNow(startDate, { addSuffix: true });
  const time = startDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = startDate.toLocaleDateString("en-CA");

  const getDuration = () => {
    if (!endedAt) return null;
    const end = new Date(endedAt);
    const durationMs = end.getTime() - startDate.getTime();
    const minutes = Math.floor(durationMs / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const duration = getDuration();

  return (
    <Card className="border-border/60 bg-card/70 transition-all duration-200 hover:shadow-xl hover:shadow-black/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/workouts/${id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">{dateStr}</span>
              <span className="text-sm text-muted-foreground">{time}</span>
              {!endedAt && (
                <Badge
                  variant="secondary"
                  className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                >
                  Active
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {setCount} set{setCount !== 1 ? "s" : ""}
              </span>
              {duration && (
                <span className="text-sm text-muted-foreground">
                  {duration}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href={`/workouts/${id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
