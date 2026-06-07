"use client";

import { useSyncExternalStore } from "react";
import type { PersistedWindow } from "./types";
import { hydrate, serialize } from "./store";
import { registerCommands } from "./commands";
import { toast } from "./toast";

// Named window layouts — snapshot the current window set (same shape as the
// boot persist) under a name, restore it later from the command palette.
// Persisted to localStorage `sv:layouts`; every saved layout auto-registers
// "Layout: <name>" + delete commands via the dynamic command registry.

const KEY = "sv:layouts";

type LayoutMap = Record<string, PersistedWindow[]>;

function load(): LayoutMap {
  if (typeof localStorage === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as LayoutMap) ?? {};
  } catch {
    return {};
  }
}

let layouts: LayoutMap = load();
let names: string[] = Object.keys(layouts);
const subs = new Set<() => void>();

function commit(next: LayoutMap) {
  layouts = next;
  names = Object.keys(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  subs.forEach((f) => f());
  syncLayoutCommands();
}

/** Snapshot the current windows. No name → auto "Layout N". Returns the name. */
export function saveLayout(name?: string): string {
  const n = name?.trim() || nextName();
  commit({ ...layouts, [n]: serialize() });
  toast(`Layout "${n}" saved`);
  return n;
}

/** Replace the current window set with a saved layout (apps re-open lazily). */
export function restoreLayout(name: string): boolean {
  const snap = layouts[name];
  if (!snap) return false;
  hydrate(snap);
  toast(`Layout "${name}" restored`);
  return true;
}

export function deleteLayout(name: string): void {
  if (!(name in layouts)) return;
  const { [name]: _gone, ...rest } = layouts;
  commit(rest);
  toast(`Layout "${name}" deleted`);
}

export function listLayouts(): string[] {
  return names;
}

export function useLayouts(): string[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => names,
    () => names,
  );
}

function nextName(): string {
  let i = 1;
  while (`Layout ${i}` in layouts) i++;
  return `Layout ${i}`;
}

function syncLayoutCommands() {
  registerCommands("layouts", [
    {
      id: "layout:save",
      label: "Save current layout",
      hint: "Layout",
      keywords: "window arrangement snapshot",
      run: () => saveLayout(),
    },
    ...names.flatMap((n) => [
      {
        id: `layout:restore:${n}`,
        label: `Restore layout: ${n}`,
        hint: "Layout",
        keywords: "windows arrangement",
        run: () => restoreLayout(n),
      },
      {
        id: `layout:delete:${n}`,
        label: `Delete layout: ${n}`,
        hint: "Layout",
        run: () => deleteLayout(n),
      },
    ]),
  ]);
}
syncLayoutCommands();
