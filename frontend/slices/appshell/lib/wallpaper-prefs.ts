"use client";

import { useSyncExternalStore } from "react";
import type { ShellId } from "../registry/shells";

// Per-shell wallpaper override. Each shell (macOS/Windows/iOS/Android/Dashboard)
// can pick its own backdrop; an unset shell falls back to its native default
// (Wallpaper resolves `shellDefault`). A value is either a static preset key
// ("aurora" | "graphite" | "win11" | "material" | "ios") or "live:<id>" for a
// registered live wallpaper. Persisted per-device to localStorage (like sv:shell
// / sv:dock) — NOT synced through the global appearance tweaks. A per-shell choice
// wins over the global wallpaper for that shell (see components/wallpaper.tsx).
export type ShellWallpapers = Partial<Record<ShellId, string>>;

const KEY = "sv:wallpaper";
const EMPTY: ShellWallpapers = {};

function load(): ShellWallpapers {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? (v as ShellWallpapers) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let prefs: ShellWallpapers = load();
const subs = new Set<() => void>();

/** Set one shell's wallpaper override, or clear it (null → native default). */
export function setShellWallpaper(shell: ShellId, value: string | null) {
  const next = { ...prefs };
  if (value) next[shell] = value;
  else delete next[shell];
  prefs = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / SSR — in-memory only */
  }
  for (const s of subs) s();
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

/** All per-shell overrides (reactive) — for the Settings picker. */
export function useShellWallpapers(): ShellWallpapers {
  return useSyncExternalStore(subscribe, () => prefs, () => EMPTY);
}

/** One shell's override, or undefined if unset (reactive) — for Wallpaper. */
export function useShellWallpaper(shell: ShellId): string | undefined {
  return useSyncExternalStore(subscribe, () => prefs[shell], () => undefined);
}
