"use client";

import { useEffect } from "react";
import { useEditor } from "../lib/store";

const TOOL_KEYS: Record<string, "move" | "select" | "brush" | "eraser" | "eyedropper" | "hand"> = {
  v: "move",
  m: "select",
  b: "brush",
  e: "eraser",
  i: "eyedropper",
  h: "hand",
};

// Global editor shortcuts: ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo,
// Delete/Backspace removes the selection, V/B/E/H pick tools. Ignored while a
// text field is focused so typing in panels isn't hijacked.
export function useKeyboard() {
  const { undo, redo, removeLayer, selectedId, setTool, swapColors, resetColors } = useEditor();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod && e.key.toLowerCase() === "x") { e.preventDefault(); swapColors(); return; }
      if (!mod && e.key.toLowerCase() === "d") { e.preventDefault(); resetColors(); return; }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeLayer(selectedId);
        return;
      }
      const t = TOOL_KEYS[e.key.toLowerCase()];
      if (t && !mod) setTool(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeLayer, selectedId, setTool, swapColors, resetColors]);
}
