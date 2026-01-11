"use client";

import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkoutSet {
  id: string;
  performedAt: string;
  exerciseName: string;
  exerciseType: string;
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

interface ExerciseSetsGroupProps {
  exerciseName: string;
  sets: WorkoutSet[];
  onDeleteSet?: (id: string) => void;
}

export function ExerciseSetsGroup({
  exerciseName,
  sets,
  onDeleteSet,
}: ExerciseSetsGroupProps) {
  const isCardio = sets.length > 0 && sets[0].exerciseType === "cardio";

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Exercise Header */}
      <div className="bg-muted/50 px-4 py-3 border-b">
        <h3 className="font-semibold">{exerciseName}</h3>
      </div>

      {/* Sets Table */}
      <div className="divide-y">
        {isCardio ? (
          /* Cardio View - simpler layout for duration-based exercises */
          sets.map((set, index) => (
            <div
              key={set.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/20"
            >
              <div className="col-span-1 text-sm font-medium text-muted-foreground">
                {index + 1}
              </div>
              <div className="col-span-4 font-semibold">
                {set.durationMinutes} min
              </div>
              <div className="col-span-6 text-sm text-muted-foreground truncate">
                {set.notes || "—"}
              </div>
              <div className="col-span-1 flex justify-end">
                {onDeleteSet && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDeleteSet(set.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        ) : (
          /* Resistance Training View - table with kg/reps */
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase bg-muted/30">
              <div className="col-span-1">Set</div>
              <div className="col-span-3 text-center">Kg</div>
              <div className="col-span-3 text-center">Reps</div>
              <div className="col-span-4">Notes</div>
              <div className="col-span-1"></div>
            </div>

            {/* Set Rows */}
            {sets.map((set, index) => (
              <div
                key={set.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/20"
              >
                <div className="col-span-1 text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <div className="col-span-3 text-center font-semibold">
                  {set.weightKg !== null ? `${set.weightKg}` : "—"}
                </div>
                <div className="col-span-3 text-center font-semibold">
                  {set.reps ?? "—"}
                </div>
                <div className="col-span-4 text-sm text-muted-foreground truncate">
                  {set.notes || "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  {onDeleteSet && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onDeleteSet(set.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
