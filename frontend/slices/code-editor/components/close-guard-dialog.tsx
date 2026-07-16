"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Unsaved-changes prompt shown when a dirty window is closed: Save (writes then
// closes) / Don't Save (discards + closes) / Cancel (keeps the window open).
export function CloseGuardDialog({
  open,
  onOpenChange,
  fileLabel,
  onSave,
  onDiscard,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save changes before closing?</AlertDialogTitle>
          <AlertDialogDescription>
            {fileLabel} has unsaved edits. They&apos;ll be lost if you
            don&apos;t save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={onCancel} className="[@media(pointer:coarse)]:min-h-[44px]">Cancel</AlertDialogCancel>
          <Button
            variant="ghost"
            className="text-destructive [@media(pointer:coarse)]:min-h-[44px]"
            onClick={onDiscard}
          >
            Don&apos;t Save
          </Button>
          <AlertDialogAction onClick={onSave} className="[@media(pointer:coarse)]:min-h-[44px]">Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
