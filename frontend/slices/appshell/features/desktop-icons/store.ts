"use client";

import { useSyncExternalStore } from "react";

// Desktop shortcut icons — app launchers free-positioned on the wallpaper (behind
// windows), draggable, double-click to open, marquee-selectable. Positions persist
// per-app; selection is ephemeral. ponytail: app shortcuts only (no arbitrary
// files/links yet) — the 80% "desktop icons" win.

export type DesktopIconKind = "app" | "link" | "file";
// An icon is an app shortcut, a URL link, or a filesystem path.
export type DesktopIcon = { id: string; x: number; y: number } & (
  | { kind: "app"; app: string }
  | { kind: "link"; url: string; label: string }
  | { kind: "file"; path: string; label: string }
);
export type NewIcon =
  | { kind: "app"; app: string }
  | { kind: "link"; url: string; label: string }
  | { kind: "file"; path: string; label: string };

export const ICON_W = 76;
export const ICON_H = 82;
const KEY = "os-vps:desktop-icons";
const DEFAULT: DesktopIcon[] = [
  { id: "files-manager", kind: "app", app: "files-manager", x: 16, y: 12 },
  { id: "system-monitor", kind: "app", app: "system-monitor", x: 16, y: 106 },
  { id: "os-settings", kind: "app", app: "os-settings", x: 16, y: 200 },
];

// Validate + migrate one persisted entry (legacy `{app,x,y}` with no `kind` →
// an app icon). Returns null for anything unrecognized.
function cleanIcon(v: Record<string, unknown> | null): DesktopIcon | null {
  if (!v || typeof v.id !== "string" || typeof v.x !== "number" || typeof v.y !== "number") return null;
  const base = { id: v.id, x: v.x, y: v.y };
  const kind = (v.kind as string) ?? (typeof v.app === "string" ? "app" : null);
  if (kind === "app" && typeof v.app === "string") return { ...base, kind: "app", app: v.app };
  if (kind === "link" && typeof v.url === "string") return { ...base, kind: "link", url: v.url, label: String(v.label ?? v.url) };
  if (kind === "file" && typeof v.path === "string") return { ...base, kind: "file", path: v.path, label: String(v.label ?? v.path) };
  return null;
}

function load(): DesktopIcon[] {
  if (typeof localStorage === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map(cleanIcon).filter((i): i is DesktopIcon => i !== null) : DEFAULT;
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

let iconSeq = 0;
export function addIcon(icon: NewIcon) {
  const y = icons.length ? Math.max(...icons.map((i) => i.y)) + 94 : 12;
  const id = `${icon.kind}-${Date.now().toString(36)}-${iconSeq++}`;
  commit([...icons, { id, x: 16, y, ...icon } as DesktopIcon]);
}

// Add-icon dialog kind (ephemeral) — "link" or "file"; null = closed. Opened
// from the desktop right-click menu ("Add link…" / "Add file…").
let addKind: Exclude<DesktopIconKind, "app"> | null = null;
const addSubs = new Set<() => void>();
export function setAddDialog(kind: Exclude<DesktopIconKind, "app"> | null) {
  addKind = kind;
  addSubs.forEach((f) => f());
}
export function useAddDialog(): Exclude<DesktopIconKind, "app"> | null {
  return useSyncExternalStore(
    (cb) => { addSubs.add(cb); return () => { addSubs.delete(cb); }; },
    () => addKind,
    () => null,
  );
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
