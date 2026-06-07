"use client";
/* Shell registry — the seam that makes the OS surface pluggable. Each shell is a
   self-contained chrome (macOS / Windows / Dashboard / iOS / Android …) that
   renders the SAME apps + window store + feature slots; only the navigation +
   look differ. The user picks a shell PER SURFACE (a desktop look + a mobile
   look, independently — Settings); the live form factor (ResponsiveProvider)
   decides which one renders. Preference persists to localStorage `sv:shell` as
   `{ desktop, mobile }`; defaults macOS + iOS.

   Shells register themselves at module load via `registerShell()` (appshell
   registers macOS/iOS/Windows/Android; the data-aware Dashboard + Mobile shells
   register from the app layer). The Settings pickers read `shellsForSurface()`;
   the surface resolves via `resolveShell()`. No shell forks the window store —
   they only call the existing store actions. */
import { useSyncExternalStore, type ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { registerCommands } from "../lib/commands";

export type ShellId = "macos" | "windows" | "dashboard" | "mobile" | "ios" | "android";
export type ShellSurface = "desktop" | "mobile";

export type ShellDescriptor = {
  id: ShellId;
  label: string;
  icon: LucideIcon;
  /** Phone-shaped (mobile) shells render framed on a wide screen. */
  surface: ShellSurface;
  group: "Desktop" | "Mobile";
  /** True for shells that render FLOATING windows (macOS, Windows). Single-pane
   *  shells (Dashboard) and one-app-at-a-time mobile shells leave it falsy, so
   *  window-only hotkeys (⌘+Arrow snap) stay inert there. */
  windowed?: boolean;
  /** The shell's own wallpaper preset (a `.wp-*` class suffix). Used when the
   *  user's wallpaper choice is "auto" — each OS shows its native backdrop. */
  wallpaper?: string;
  /** The chrome. Reads `useApps()` + store hooks + `<Slot>` internally. */
  render: ComponentType;
};

const REGISTRY = new Map<ShellId, ShellDescriptor>();
const order: ShellId[] = ["dashboard", "macos", "windows", "mobile", "ios", "android"];

export function registerShell(d: ShellDescriptor): void {
  REGISTRY.set(d.id, d);
  syncShellCommands();
}

// Every registered shell is switchable from the command palette — registered
// dynamically so consumer-added shells appear with zero extra wiring.
function syncShellCommands(): void {
  registerCommands(
    "shells",
    shellList().map((s) => ({
      id: `shell:${s.id}`,
      label: `Switch ${s.surface} shell: ${s.label}`,
      hint: "Shell",
      keywords: `os layout ${s.id}`,
      run: () => setShell(s.surface, s.id),
    })),
  );
}
export function getShell(id: ShellId | null | undefined): ShellDescriptor | undefined {
  return id ? REGISTRY.get(id) : undefined;
}
/** Registered shells in display order (for the switcher). */
export function shellList(): ShellDescriptor[] {
  return order.map((id) => REGISTRY.get(id)).filter(Boolean) as ShellDescriptor[];
}

// ── per-surface shell preference (persisted) ───────────────────────────────
// The user picks a shell for EACH surface separately (a desktop look + a mobile
// look); the active one is resolved by the live form factor (ResponsiveProvider,
// which already honours the device override). Stored as { desktop, mobile }.
const KEY = "sv:shell";

export type ShellPrefs = { desktop: ShellId; mobile: ShellId };
const DEFAULTS: ShellPrefs = { desktop: "macos", mobile: "ios" };
const DESKTOP_IDS: ShellId[] = ["macos", "windows", "dashboard"];
const MOBILE_IDS: ShellId[] = ["ios", "android", "mobile"];

export function surfaceOf(id: ShellId): ShellSurface {
  return MOBILE_IDS.includes(id) ? "mobile" : "desktop";
}

function load(): ShellPrefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<ShellPrefs>;
    return {
      desktop: DESKTOP_IDS.includes(p.desktop as ShellId) ? (p.desktop as ShellId) : DEFAULTS.desktop,
      mobile: MOBILE_IDS.includes(p.mobile as ShellId) ? (p.mobile as ShellId) : DEFAULTS.mobile,
    };
  } catch {
    return DEFAULTS;
  }
}

let prefs: ShellPrefs = load();
const subs = new Set<() => void>();

/** Set the shell for one surface (guarded — a mobile shell can't fill the
 *  desktop slot or vice versa). */
export function setShell(surface: ShellSurface, id: ShellId): void {
  if (surfaceOf(id) !== surface) return;
  prefs = { ...prefs, [surface]: id };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

export function useShellPrefs(): ShellPrefs {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => prefs,
    () => DEFAULTS,
  );
}

/** Shells registered for a given surface (for the per-surface Settings pickers). */
export function shellsForSurface(surface: ShellSurface): ShellDescriptor[] {
  return shellList().filter((s) => s.surface === surface);
}

/** Resolve the shell descriptor for a surface from prefs, with a safe default. */
export function resolveShell(surface: ShellSurface, p: ShellPrefs): ShellDescriptor {
  const id = surface === "mobile" ? p.mobile : p.desktop;
  const d = REGISTRY.get(id);
  if (d && d.surface === surface) return d;
  return REGISTRY.get(surface === "mobile" ? "ios" : "macos") ?? shellList().find((s) => s.surface === surface)!;
}
