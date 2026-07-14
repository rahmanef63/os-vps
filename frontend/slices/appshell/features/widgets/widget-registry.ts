"use client";

import { useSyncExternalStore } from "react";

// Editable desktop-widget set: a registry of widget TYPES + a persisted, ordered
// list of which are enabled + a master on/off for the wallpaper-layer stack.
// ponytail: enable/disable + order is the 80% "editable widgets" win; free
// drag/resize + a picker dialog are a later slice — this file is the foundation.

export type WidgetMeta = { id: string; title: string };

// Per-widget size (macOS-widget style S/M/L). Drives the card width in the
// desktop stack; set from each widget's right-click menu. Default "m".
export type WidgetSize = "s" | "m" | "l";
const SIZES: WidgetSize[] = ["s", "m", "l"];

// Metadata SSOT (kept separate from the render tree so the store never imports
// components). widgets-defs.tsx maps these ids to render components.
export const WIDGET_META: WidgetMeta[] = [
  { id: "cpu", title: "CPU" },
  { id: "mem", title: "Memory" },
  { id: "disk", title: "Storage" },
  { id: "clock", title: "Clock" },
  { id: "net", title: "Network" },
  { id: "uptime", title: "Uptime" },
  { id: "calendar", title: "Calendar" },
  { id: "tasks", title: "Tasks" },
  { id: "timer", title: "Timer" },
  { id: "notes", title: "Notes" },
  { id: "html", title: "HTML" },
  { id: "embed", title: "Embed" },
  { id: "quicklinks", title: "Quicklinks" },
  { id: "theme", title: "Theme" },
  { id: "shell", title: "Shell" },
];

const KEY = "os-vps:desktop-widgets"; // { on, enabled[], sizes{} }
const LEGACY_KEY = "sv:desktop-widgets"; // old "1"/"0" on-flag (pre-registry)
const DEFAULT_ENABLED = ["cpu", "mem", "disk"];

export type WidgetPos = { x: number; y: number };
export type WidgetState = {
  on: boolean;
  enabled: string[];
  sizes: Record<string, WidgetSize>;
  /** Free-drag position per widget (section-relative px). Missing = the layer
   *  auto-places it in the top-right column on mount. */
  positions: Record<string, WidgetPos>;
  /** Which desktop Space (0 or 1) each widget lives on. Missing = 0. */
  spaces: Record<string, number>;
};

// Keep only {id: valid-size} pairs — drops corrupt/legacy values.
function cleanSizes(raw: unknown): Record<string, WidgetSize> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, WidgetSize> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (SIZES.includes(v as WidgetSize)) out[id] = v as WidgetSize;
  }
  return out;
}
function cleanPositions(raw: unknown): Record<string, WidgetPos> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, WidgetPos> = {};
  for (const [id, v] of Object.entries(raw as Record<string, { x?: unknown; y?: unknown }>)) {
    if (v && typeof v.x === "number" && typeof v.y === "number") out[id] = { x: v.x, y: v.y };
  }
  return out;
}
function cleanSpaces(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === 0 || v === 1) out[id] = v;
  }
  return out;
}

function load(): WidgetState {
  const empty = { positions: {}, spaces: {} };
  if (typeof localStorage === "undefined") return { on: false, enabled: DEFAULT_ENABLED, sizes: {}, ...empty };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<WidgetState>;
      const enabled = Array.isArray(p.enabled)
        ? p.enabled.filter((id): id is string => typeof id === "string" && WIDGET_META.some((w) => w.id === id))
        : DEFAULT_ENABLED;
      // Migration: pre-position/-space saves just lack those keys → default {}.
      return { on: !!p.on, enabled, sizes: cleanSizes(p.sizes), positions: cleanPositions(p.positions), spaces: cleanSpaces(p.spaces) };
    }
    // No saved state yet → default the stack ON so the desktop widgets are
    // visible out of the box (macOS-Sonoma style; toggle off anytime). Respect a
    // legacy explicit "off" so anyone who turned the old stack off keeps it off.
    return { on: localStorage.getItem(LEGACY_KEY) !== "0", enabled: DEFAULT_ENABLED, sizes: {}, ...empty };
  } catch {
    return { on: false, enabled: DEFAULT_ENABLED, sizes: {}, ...empty };
  }
}

let state: WidgetState = load();
const subs = new Set<() => void>();

function commit(next: WidgetState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — best-effort */
  }
  subs.forEach((f) => f());
}

export function useWidgetState(): WidgetState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => state,
    () => state,
  );
}

export const getWidgetState = (): WidgetState => state;
export const isWidgetOn = (id: string): boolean => state.enabled.includes(id);

export function setWidgetsOn(on: boolean) {
  commit({ ...state, on });
}

export function toggleWidget(id: string) {
  if (state.enabled.includes(id)) {
    commit({ ...state, enabled: state.enabled.filter((x) => x !== id) });
  } else {
    // A newly-enabled widget lands on the CURRENT Space; the layer assigns its
    // position on mount (top-right column).
    commit({ ...state, enabled: [...state.enabled, id], spaces: { ...state.spaces, [id]: currentSpace } });
  }
}

export function moveWidget(id: string, dir: -1 | 1) {
  const i = state.enabled.indexOf(id);
  if (i === -1) return;
  const j = i + dir;
  if (j < 0 || j >= state.enabled.length) return;
  const enabled = [...state.enabled];
  [enabled[i], enabled[j]] = [enabled[j], enabled[i]];
  commit({ ...state, enabled });
}

export const getWidgetSize = (id: string): WidgetSize => state.sizes[id] ?? "m";

export function setWidgetSize(id: string, size: WidgetSize) {
  if (getWidgetSize(id) === size) return;
  commit({ ...state, sizes: { ...state.sizes, [id]: size } });
}

// ── Free-drag position + per-space ───────────────────────────────────────────
export const getWidgetPos = (id: string): WidgetPos | undefined => state.positions[id];

export function setWidgetPos(id: string, x: number, y: number) {
  commit({ ...state, positions: { ...state.positions, [id]: { x: Math.max(0, x), y: Math.max(0, y) } } });
}

export function nudgeWidgetPos(id: string, dx: number, dy: number) {
  const p = state.positions[id] ?? { x: 0, y: 0 };
  setWidgetPos(id, p.x + dx, p.y + dy);
}

export const getWidgetSpace = (id: string): number => state.spaces[id] ?? 0;

export function setWidgetSpace(id: string, space: number) {
  commit({ ...state, spaces: { ...state.spaces, [id]: space } });
}

// Current Space (0|1) — ephemeral (resets to 0 on reload); the space pager sets it.
let currentSpace = 0;
const spaceSubs = new Set<() => void>();
export const getCurrentSpace = (): number => currentSpace;
export function setCurrentSpace(s: number) {
  if (currentSpace === s) return;
  currentSpace = s;
  spaceSubs.forEach((f) => f());
}
export function useCurrentSpace(): number {
  return useSyncExternalStore(
    (cb) => { spaceSubs.add(cb); return () => { spaceSubs.delete(cb); }; },
    () => currentSpace,
    () => 0,
  );
}

// Picker-dialog open flag — ephemeral (not persisted). Kept here so any surface
// (palette command, desktop context menu) can open the picker.
let pickerOpen = false;
const pickerSubs = new Set<() => void>();

export function setPickerOpen(v: boolean) {
  pickerOpen = v;
  pickerSubs.forEach((f) => f());
}

export function usePickerOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      pickerSubs.add(cb);
      return () => {
        pickerSubs.delete(cb);
      };
    },
    () => pickerOpen,
    () => false,
  );
}
