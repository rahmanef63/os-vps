"use client";

import { useSyncExternalStore } from "react";
import { registerCommands } from "./commands";

// Keyboard-shortcut registry — sources register their hints; the bundled
// shortcut-help feature renders the ⌘/ cheat-sheet from it. Same source-keyed
// pattern as lib/commands.ts (re-register replaces, consumers extend freely).
// Remapping is intentionally out of scope (hints describe, they don't bind).

export type ShortcutHint = { keys: string; label: string; group?: string };

let hints: ShortcutHint[] = [];
const sources = new Map<string, ShortcutHint[]>();
const subs = new Set<() => void>();

function emit() {
  hints = [...sources.values()].flat();
  subs.forEach((f) => f());
}

export function registerShortcuts(source: string, list: ShortcutHint[]): () => void {
  sources.set(source, list);
  emit();
  return () => {
    if (sources.get(source) === list) {
      sources.delete(source);
      emit();
    }
  };
}

export function listShortcuts(): ShortcutHint[] {
  return hints;
}

export function useShortcuts(): ShortcutHint[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => hints,
    () => hints,
  );
}

// open/close state for the cheat-sheet overlay
let open = false;
export function setShortcutHelpOpen(v: boolean): void {
  if (open === v) return;
  open = v;
  subs.forEach((f) => f());
}
export function useShortcutHelpOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => open,
    () => open,
  );
}

// the shell's own bindings
registerShortcuts("appshell", [
  { keys: "⌘K", label: "Command palette", group: "System" },
  { keys: "⌘I", label: "AI Inspector", group: "System" },
  { keys: "⌘/", label: "Keyboard shortcuts", group: "System" },
  { keys: "⌘⇧V", label: "Clipboard history", group: "System" },
  { keys: "Space", label: "Quick Look (selected item)", group: "System" },
  { keys: "⌘Tab", label: "App switcher", group: "Windows" },
  { keys: "F3", label: "Mission Control", group: "Windows" },
  { keys: "⌘←/→", label: "Snap window left / right", group: "Windows" },
  { keys: "⌘↑", label: "Maximize window", group: "Windows" },
  { keys: "⌘↓", label: "Restore / minimize window", group: "Windows" },
]);

registerCommands("shortcut-help", [
  {
    id: "shortcuts:open",
    label: "Keyboard shortcuts",
    hint: "Help",
    keywords: "hotkeys cheat sheet bindings keys",
    run: () => setShortcutHelpOpen(true),
  },
]);
