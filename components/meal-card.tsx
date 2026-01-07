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

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case "breakfast":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "lunch":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "dinner":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "snack":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className={getMealTypeColor(mealType)}
              >
                {mealType}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {dateStr} · {time}
              </span>
            </div>
            <p className="text-sm font-medium truncate">{description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-semibold">{calories} kcal</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>

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
        </div>
      </CardContent>
    </Card>
  );
}
