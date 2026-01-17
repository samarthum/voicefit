"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MealCardProps {
  id: string;
  description: string;
  calories: number;
  mealType: string;
  eatenAt: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Map meal type to badge variant
const getMealTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "breakfast":
      return "breakfast" as const;
    case "lunch":
      return "lunch" as const;
    case "dinner":
      return "dinner" as const;
    case "snack":
      return "snack" as const;
    default:
      return "secondary" as const;
  }
};

export function MealCard({
  id,
  description,
  calories,
  mealType,
  eatenAt,
  onEdit,
  onDelete,
}: MealCardProps) {
  const date = new Date(eatenAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <Card className="border-border/60 bg-card/70 transition-all duration-200 hover:shadow-xl hover:shadow-black/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={getMealTypeBadgeVariant(mealType)} className="text-[10px] px-2 py-0.5">
                {mealType}
              </Badge>
              <p className="text-sm font-medium truncate flex-1">{description}</p>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-base font-semibold tabular-nums text-orange-300">
                  {calories}
                </span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {time}
              </span>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground/70">
                {timeAgo}
              </span>
            </div>
          </div>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="shrink-0 h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
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
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
