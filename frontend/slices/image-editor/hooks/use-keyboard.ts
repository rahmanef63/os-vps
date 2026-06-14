"use client";

import { useEditor } from "../lib/store";
import { useConfirmRemoveLayer } from "../components/confirm-remove-layer";
import { useFocusedHotkey, type HotkeyDef } from "@/features/appshell";

const TOOL_KEYS: Record<string, "move" | "select" | "brush" | "eraser" | "eyedropper" | "hand"> = {
  v: "move",
  m: "select",
  b: "brush",
  e: "eraser",
  i: "eyedropper",
  h: "hand",
};

const TOOL_DEFS: HotkeyDef[] = Object.keys(TOOL_KEYS).map((k) => ({ key: k }));
const UNDO_DEFS: HotkeyDef[] = [
  { key: "z", meta: true },
  { key: "z", ctrl: true },
];
const REDO_DEFS: HotkeyDef[] = [
  { key: "z", meta: true, shift: true },
  { key: "z", ctrl: true, shift: true },
  { key: "y", meta: true },
  { key: "y", ctrl: true },
];
const REMOVE_DEFS: HotkeyDef[] = [{ key: "Delete" }, { key: "Backspace" }];
const SWAP_DEFS: HotkeyDef[] = [{ key: "x" }];
const RESET_DEFS: HotkeyDef[] = [{ key: "d" }];

// Editor shortcuts: ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo,
// Delete/Backspace removes the selection, V/B/E/H/M/I pick tools. Gated on the
// host shell's focused-window id — Backspace in another window's input will
// NOT delete a layer here. Editable surfaces are skipped (default), so typing
// in panels never hijacks a tool key.
export function useKeyboard(winId?: string) {
  const { undo, redo, selectedId, setTool, swapColors, resetColors } = useEditor();
  const requestRemoveLayer = useConfirmRemoveLayer();
  useFocusedHotkey(winId, UNDO_DEFS, () => undo());
  useFocusedHotkey(winId, REDO_DEFS, () => redo());
  useFocusedHotkey(winId, REMOVE_DEFS, () => {
    if (!selectedId) return;
    // Confirm-gated: empty paint layers drop without a prompt; anything with
    // content (paint pixels / image / text / shape / adjustment) pops the
    // destructive dialog instead.
    requestRemoveLayer(selectedId);
  });
  useFocusedHotkey(winId, SWAP_DEFS, () => swapColors());
  useFocusedHotkey(winId, RESET_DEFS, () => resetColors());
  useFocusedHotkey(winId, TOOL_DEFS, (e) => {
    const t = TOOL_KEYS[e.key.toLowerCase()];
    if (t) setTool(t);
  });
}
