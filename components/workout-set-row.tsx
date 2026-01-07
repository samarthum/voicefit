"use client";

import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkoutSetRowProps {
  id: string;
  exerciseName: string;
  reps: number;
  weightKg: number | null;
  notes: string | null;
  index: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkoutSetRow({
  id,
  exerciseName,
  reps,
  weightKg,
  notes,
  index,
  onEdit,
  onDelete,
}: WorkoutSetRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
        <div>
          <p className="text-sm font-medium">{exerciseName}</p>
          <p className="text-sm text-muted-foreground">
            {reps} reps
            {weightKg && ` @ ${weightKg} kg`}
            {notes && ` (${notes})`}
          </p>
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
  );
}
