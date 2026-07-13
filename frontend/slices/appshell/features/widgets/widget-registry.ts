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
  { id: "notes", title: "Notes" },
  { id: "quicklinks", title: "Quicklinks" },
];

const KEY = "os-vps:desktop-widgets"; // { on, enabled[], sizes{} }
const LEGACY_KEY = "sv:desktop-widgets"; // old "1"/"0" on-flag (pre-registry)
const DEFAULT_ENABLED = ["cpu", "mem", "disk"];

export type WidgetState = { on: boolean; enabled: string[]; sizes: Record<string, WidgetSize> };

// Keep only {id: valid-size} pairs — drops corrupt/legacy values.
function cleanSizes(raw: unknown): Record<string, WidgetSize> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, WidgetSize> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (SIZES.includes(v as WidgetSize)) out[id] = v as WidgetSize;
  }
  return out;
}

function load(): WidgetState {
  if (typeof localStorage === "undefined") return { on: false, enabled: DEFAULT_ENABLED, sizes: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<WidgetState>;
      const enabled = Array.isArray(p.enabled)
        ? p.enabled.filter((id): id is string => typeof id === "string" && WIDGET_META.some((w) => w.id === id))
        : DEFAULT_ENABLED;
      return { on: !!p.on, enabled, sizes: cleanSizes(p.sizes) };
    }
    // No saved state yet → default the stack ON so the desktop widgets are
    // visible out of the box (macOS-Sonoma style; toggle off anytime). Respect a
    // legacy explicit "off" so anyone who turned the old stack off keeps it off.
    return { on: localStorage.getItem(LEGACY_KEY) !== "0", enabled: DEFAULT_ENABLED, sizes: {} };
  } catch {
    return { on: false, enabled: DEFAULT_ENABLED, sizes: {} };
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
  const enabled = state.enabled.includes(id)
    ? state.enabled.filter((x) => x !== id)
    : [...state.enabled, id];
  commit({ ...state, enabled });
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
