"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface MetricInterpretationDialogProps {
  open: boolean;
  metricType: "weight" | "steps";
  value: number | null;
  confidence?: number;
  assumptions?: string[];
  isLoading?: boolean;
  onSave: (value: number) => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
}

export function MetricInterpretationDialog({
  open,
  metricType,
  value,
  confidence,
  assumptions = [],
  isLoading = false,
  onSave,
  onCancel,
  onOpenChange,
}: MetricInterpretationDialogProps) {
  const [valueInput, setValueInput] = useState<string>(value?.toString() ?? "");

  useEffect(() => {
    setValueInput(value?.toString() ?? "");
  }, [value, metricType, open]);

  const getConfidenceColor = (score?: number) => {
    if (score === undefined || score === null) return "bg-muted text-muted-foreground";
    if (score >= 0.8) return "bg-green-500/10 text-green-500";
    if (score >= 0.5) return "bg-yellow-500/10 text-yellow-500";
    return "bg-red-500/10 text-red-500";
  };

  const handleSave = () => {
    const parsed =
      metricType === "steps"
        ? parseInt(valueInput, 10)
        : parseFloat(valueInput);

    if (!Number.isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const label = metricType === "steps" ? "Steps" : "Weight (kg)";
  const placeholder = metricType === "steps" ? "e.g., 8500" : "e.g., 72.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {metricType === "steps" ? "Steps" : "Weight"}</DialogTitle>
          <DialogDescription>
            Confirm the {metricType === "steps" ? "step count" : "weight"} before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Analyzing entry...</span>
            </div>
          ) : (
            <>
              {confidence !== undefined && (
                <Badge variant="secondary" className={getConfidenceColor(confidence)}>
                  {Math.round(confidence * 100)}% confident
                </Badge>
              )}

              <div className="space-y-2">
                <Label htmlFor="metricValue">{label}</Label>
                <Input
                  id="metricValue"
                  type="number"
                  min="0"
                  step={metricType === "steps" ? "1" : "0.1"}
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  placeholder={placeholder}
                />
              </div>

              {assumptions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assumptions</Label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
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
            disabled={isLoading || !valueInput.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
