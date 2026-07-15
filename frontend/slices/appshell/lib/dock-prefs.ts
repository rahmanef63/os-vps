"use client";

import { useSyncExternalStore } from "react";

// macOS dock preferences — resting icon size + whether hover magnification is on.
// Persisted to localStorage; read reactively by the dock and the Settings control.
export type DockSize = "small" | "medium" | "large";
export type DockPrefs = { size: DockSize; magnify: boolean };

// Resting icon px per size. The magnification pool in dock.tsx derives from this.
export const DOCK_SIZE_PX: Record<DockSize, number> = { small: 40, medium: 50, large: 64 };

const KEY = "sv:dock";
const DEFAULT: DockPrefs = { size: "medium", magnify: true };

function load(): DockPrefs {
  if (typeof localStorage === "undefined") return DEFAULT;
  try {
    return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<DockPrefs>) };
  } catch {
    return DEFAULT;
  }
}

let prefs: DockPrefs = load();
const subs = new Set<() => void>();

export function setDockPrefs(patch: Partial<DockPrefs>) {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / SSR — in-memory only */
  }
  for (const s of subs) s();
}

export function useDockPrefs(): DockPrefs {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => prefs,
    () => DEFAULT,
  );
}
