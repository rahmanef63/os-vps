// Keyboard shortcut handler for the editor root. Ignores typing in fields.
// Space=play/pause, S=split, ⌘Z/⌘⇧Z (or ⌘Y)=undo/redo, Delete/Backspace=delete.

"use client";

import { useCallback } from "react";

export function useShortcuts(a: {
  hasSel: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onTogglePlay: () => void;
}) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        e.shiftKey ? a.onRedo() : a.onUndo();
      } else if (mod && k === "y") {
        e.preventDefault();
        a.onRedo();
      } else if (k === "s" && !mod) {
        e.preventDefault();
        a.onSplit();
      } else if ((e.key === "Backspace" || e.key === "Delete") && a.hasSel) {
        e.preventDefault();
        a.onDelete();
      } else if (e.key === " ") {
        e.preventDefault();
        a.onTogglePlay();
      }
    },
    [a],
  );
}
