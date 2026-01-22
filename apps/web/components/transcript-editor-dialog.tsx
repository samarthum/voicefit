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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface TranscriptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: string;
  isLoading?: boolean;
  onContinue: (transcript: string) => void;
  onCancel: () => void;
}

export function TranscriptEditorDialog({
  open,
  onOpenChange,
  transcript: initialTranscript,
  isLoading = false,
  onContinue,
  onCancel,
}: TranscriptEditorDialogProps) {
  const [transcript, setTranscript] = useState(initialTranscript);

  // Sync local state when prop changes
  useEffect(() => {
    setTranscript(initialTranscript);
  }, [initialTranscript]);

  const handleContinue = () => {
    if (transcript.trim()) {
      onContinue(transcript.trim());
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transcript</DialogTitle>
          <DialogDescription>
            Review and edit the transcript before processing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Transcribing...</span>
            </div>
          ) : (
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcript will appear here..."
              className="min-h-[120px] resize-none"
            />
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading || !transcript.trim()}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
