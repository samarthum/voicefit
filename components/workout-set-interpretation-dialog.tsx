"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { WorkoutSetInterpretation } from "@/lib/types";

interface WorkoutSetInterpretationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interpretation: WorkoutSetInterpretation | null;
  isLoading?: boolean;
  onSave: (data: {
    exerciseName: string;
    reps: number;
    weightKg: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}

export function WorkoutSetInterpretationDialog({
  open,
  onOpenChange,
  interpretation,
  isLoading = false,
  onSave,
  onCancel,
}: WorkoutSetInterpretationDialogProps) {
  const [exerciseName, setExerciseName] = useState("");
  const [reps, setReps] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (interpretation) {
      setExerciseName(interpretation.exerciseName);
      setReps(interpretation.reps ?? 0);
      setWeightKg(interpretation.weightKg?.toString() ?? "");
      setNotes(interpretation.notes ?? "");
    }
  }, [interpretation]);

  const handleSave = () => {
    if (exerciseName.trim() && reps >= 0) {
      onSave({
        exerciseName: exerciseName.trim(),
        reps,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        notes: notes.trim() || null,
      });
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500/10 text-green-500";
    if (confidence >= 0.5) return "bg-yellow-500/10 text-yellow-500";
    return "bg-red-500/10 text-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Set</DialogTitle>
          <DialogDescription>
            Review and adjust the interpreted workout set before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Analyzing set...</span>
            </div>
          ) : (
            <>
              {interpretation && (
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="secondary"
                    className={getConfidenceColor(interpretation.confidence)}
                  >
                    {Math.round(interpretation.confidence * 100)}% confident
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="exerciseName">Exercise</Label>
                <Input
                  id="exerciseName"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="e.g., Squat, Bench Press"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reps">Reps</Label>
                  <Input
                    id="reps"
                    type="number"
                    min="0"
                    value={reps}
                    onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (kg)</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    min="0"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {interpretation && interpretation.assumptions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assumptions</Label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {interpretation.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !exerciseName.trim() || reps < 0}
          >
            Save Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
