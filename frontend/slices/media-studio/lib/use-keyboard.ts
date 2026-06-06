"use client";

import { useEffect, type RefObject } from "react";
import { TOOLS, type ToolId } from "./model";

// Editor keyboard shortcuts scoped to the root element:
// V/T/R/O/S tools, ⌘Z undo, ⇧⌘Z / ⌘Y redo, Delete, Escape.
export function useKeyboard({
  rootRef,
  selected,
  onTool,
  onToggleEmoji,
  onUndo,
  onRedo,
  onDelete,
  onEscape,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  selected: string | null;
  onTool: (id: ToolId) => void;
  onToggleEmoji: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (id: string) => void;
  onEscape: () => void;
}) {
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? onRedo() : onUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
        return;
      }
      if (mod) return;
      if ((e.key === "Backspace" || e.key === "Delete") && selected) {
        e.preventDefault();
        onDelete(selected);
      } else if (e.key === "Escape") {
        onEscape();
      } else {
        const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
        if (t?.id === "sticker") onToggleEmoji();
        else if (t) onTool(t.id);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [
    rootRef,
    selected,
    onTool,
    onToggleEmoji,
    onUndo,
    onRedo,
    onDelete,
    onEscape,
  ]);
}
