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
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/timezone";

interface MetricConfirmDialogProps {
  open: boolean;
  metricType: "steps" | "weight";
  value: number | null;
  date?: string | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { value: number; date: string }) => void;
  onCancel: () => void;
}

export function MetricConfirmDialog(props: MetricConfirmDialogProps) {
  const resetKey = `${props.metricType}-${props.value ?? "none"}-${props.date ?? "none"}-${props.open ? "open" : "closed"}`;
  return <MetricConfirmDialogInner key={resetKey} {...props} />;
}

function MetricConfirmDialogInner({
  open,
  metricType,
  value,
  date,
  isLoading = false,
  onOpenChange,
  onSave,
  onCancel,
}: MetricConfirmDialogProps) {
  const [currentValue, setCurrentValue] = useState(() =>
    value !== null && value !== undefined ? String(value) : ""
  );
  const [currentDate, setCurrentDate] = useState(() => date ?? getTodayDateString());

  const handleSave = () => {
    const numericValue =
      metricType === "steps" ? parseInt(currentValue, 10) : parseFloat(currentValue);

    if (!Number.isFinite(numericValue)) {
      return;
    }
    onSave({ value: numericValue, date: currentDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {metricType === "steps" ? "Confirm Steps" : "Confirm Weight"}
          </DialogTitle>
          <DialogDescription>
            Review the detected value before saving it to your log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="metric-date">Date</Label>
            <Input
              id="metric-date"
              type="date"
              value={currentDate}
              onChange={(event) => setCurrentDate(event.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metric-value">
              {metricType === "steps" ? "Steps" : "Weight (kg)"}
            </Label>
            <Input
              id="metric-value"
              type="number"
              min={metricType === "steps" ? "0" : "20"}
              step={metricType === "steps" ? "1" : "0.1"}
              value={currentValue}
              onChange={(event) => setCurrentValue(event.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !currentValue}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
