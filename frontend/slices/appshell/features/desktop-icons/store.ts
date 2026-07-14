"use client";

import { useSyncExternalStore } from "react";

// Desktop shortcut icons — app launchers free-positioned on the wallpaper (behind
// windows), draggable, double-click to open, marquee-selectable. Positions persist
// per-app; selection is ephemeral. ponytail: app shortcuts only (no arbitrary
// files/links yet) — the 80% "desktop icons" win.

export type DesktopIcon = { id: string; app: string; x: number; y: number };

export const ICON_W = 76;
export const ICON_H = 82;
const KEY = "os-vps:desktop-icons";
const DEFAULT: DesktopIcon[] = [
  { id: "files-manager", app: "files-manager", x: 16, y: 12 },
  { id: "system-monitor", app: "system-monitor", x: 16, y: 106 },
  { id: "os-settings", app: "os-settings", x: 16, y: 200 },
];

function load(): DesktopIcon[] {
  if (typeof localStorage === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as DesktopIcon[];
    return Array.isArray(p) ? p.filter((i) => i && typeof i.app === "string" && typeof i.x === "number") : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

let icons: DesktopIcon[] = load();
const subs = new Set<() => void>();
function commit(next: DesktopIcon[]) {
  icons = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  subs.forEach((f) => f());
}

export function useDesktopIcons(): DesktopIcon[] {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => icons,
    () => icons,
  );
}
export const getDesktopIcons = (): DesktopIcon[] => icons;

// Move one icon (or, when part of the selection, the whole selection by a delta).
export function moveIcons(delta: { dx: number; dy: number }, ids: string[]) {
  const set = new Set(ids);
  commit(icons.map((i) => (set.has(i.id) ? { ...i, x: Math.max(0, i.x + delta.dx), y: Math.max(0, i.y + delta.dy) } : i)));
}
export function removeIcons(ids: string[]) {
  const set = new Set(ids);
  commit(icons.filter((i) => !set.has(i.id)));
}
export function resetDesktopIcons() {
  commit(DEFAULT);
}

// ── Selection (ephemeral) ────────────────────────────────────────────────────
let selected: ReadonlySet<string> = new Set();
const selSubs = new Set<() => void>();
const EMPTY: ReadonlySet<string> = new Set();
export function setSelected(ids: Iterable<string>) {
  selected = new Set(ids);
  selSubs.forEach((f) => f());
}
export const getSelected = (): ReadonlySet<string> => selected;
export function useSelected(): ReadonlySet<string> {
  return useSyncExternalStore(
    (cb) => { selSubs.add(cb); return () => { selSubs.delete(cb); }; },
    () => selected,
    () => EMPTY,
  );
}
