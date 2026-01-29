"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { MealInterpretation } from "@/lib/types";

interface MealInterpretationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interpretation: MealInterpretation | null;
  isLoading?: boolean;
  onSave: (data: {
    mealType: string;
    description: string;
    calories: number;
  }) => void;
  onCancel: () => void;
  selectedDate?: string; // Format: "YYYY-MM-DD"
}

function formatDateForDisplay(dateString?: string): string | null {
  if (!dateString) return null;
  const today = new Date().toLocaleDateString("en-CA");
  if (dateString === today) return null; // Don't show anything special for today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === yesterday.toLocaleDateString("en-CA")) return "Yesterday";

  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MealInterpretationDialog(props: MealInterpretationDialogProps) {
  const resetKey = props.interpretation
    ? `${props.interpretation.mealType}-${props.interpretation.description}-${props.interpretation.calories}-${props.interpretation.confidence}-${props.open ? "open" : "closed"}`
    : `meal-empty-${props.open ? "open" : "closed"}`;

  return <MealInterpretationDialogInner key={resetKey} {...props} />;
}

function MealInterpretationDialogInner({
  open,
  onOpenChange,
  interpretation,
  isLoading = false,
  onSave,
  onCancel,
  selectedDate,
}: MealInterpretationDialogProps) {
  const dateLabel = formatDateForDisplay(selectedDate);
  const [mealType, setMealType] = useState<string>(interpretation?.mealType ?? "breakfast");
  const [description, setDescription] = useState(interpretation?.description ?? "");
  const [calories, setCalories] = useState<number>(interpretation?.calories ?? 0);

  const handleSave = () => {
    if (description.trim() && calories >= 0) {
      onSave({
        mealType,
        description: description.trim(),
        calories,
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
          <DialogTitle>Review Meal</DialogTitle>
          <DialogDescription>
            {dateLabel
              ? `Logging meal for ${dateLabel}. Review and adjust the details before saving.`
              : "Review and adjust the interpreted meal details before saving."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Analyzing meal...</span>
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
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger id="mealType">
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Meal description..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
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
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !description.trim() || calories < 0}
          >
            Save Meal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
