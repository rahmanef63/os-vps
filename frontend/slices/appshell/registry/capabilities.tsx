"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import type { DeviceMode } from "../responsive/use-responsive";

export type ThemeMode = "light" | "dark";

// Appearance the shell needs to render (theme/device/wallpaper). The consumer
// adapts its own store to this shape so appshell never imports it.
export type ShellAppearance = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  device: DeviceMode;
  wallpaper?: string;
  /** Custom wallpaper background (image/gradient/colour). When set it wins over
   *  the named `wallpaper` preset. A plain CSS-properties bag so the shell never
   *  imports the host's image-picker. */
  wallpaperStyle?: CSSProperties;
};

// A ready-to-run search result (shell-search / Spotlight). The consumer builds
// the hits AND their open action, so the shell never knows the host API shape or
// which app opens a path.
export type SearchHit = { id: string; label: string; hint?: string; run: () => void };

// Live system telemetry for the mobile Today widgets (shell-widgets). null until
// the first sample; the consumer owns polling.
export type SystemStats = {
  cpu: { pct: number; cores: number };
  mem: { used: number; total: number };
  disk: { used: number; total: number };
};

// One turn of a scoped AI chat (shell-inspector). Matches the wire shape so a
// consumer can pass its stream fn straight through.
export type ChatMessage = { role: "user" | "assistant"; text: string };

// Optional server-mode tile for the mobile control center (shell-control-center).
// A generic shell with no backend toggle returns null and the tile is hidden.
export type ServerToggle = {
  live: boolean;
  label: string;
  locked: boolean;
  toggle: () => void;
};

// A user website shortcut surfaced in the dock / Launchpad / mobile grid / Today
// widget. The consumer owns the data + how it opens (the shell never knows URLs).
export type QuickLink = { id: string; title: string; url: string };
export type QuickLinks = {
  items: QuickLink[];
  open: (link: QuickLink) => void;
  /** Favicon URL for a link, or null when none can be derived. */
  faviconUrl: (url: string) => string | null;
};

// Capabilities the consumer injects via the manifest, so the generic shell + its
// feature slices have NO hard dependency on a project's appearance store, host
// API or AI backend. Each is a hook (called by the shell at a stable position)
// so the consumer can wire it to reactive sources (a theme store, a polled
// telemetry endpoint, …). Optional members degrade gracefully via the defaults.
export type ShellCapabilities = {
  /** Theme/device/wallpaper source. */
  useAppearance: () => ShellAppearance;
  /** Optional menu-bar CPU readout (0–100); null hides the chip. */
  useCpuPercent: () => number | null;
  /** shell-search: returns a search fn (the palette debounces the calls). */
  useSearch?: () => (query: string) => Promise<SearchHit[]>;
  /** shell-widgets: polled system telemetry (null until the first sample). */
  useSystemStats?: () => SystemStats | null;
  /** shell-inspector: scoped AI chat — yields text deltas. */
  useChat?: () => (messages: ChatMessage[]) => AsyncGenerator<string>;
  /** shell-control-center: optional server-mode tile (null hides it). */
  useServerToggle?: () => ServerToggle | null;
  /** Website shortcuts for the dock / Launchpad / mobile grid / Today widget. */
  useQuickLinks?: () => QuickLinks;
};

// Stable identities for the default hooks. These MUST be referentially stable
// across renders: consumers wire the real ones into effect deps (e.g. Spotlight
// depends on the search fn), so returning a fresh closure each call would spin
// an infinite render loop. The real capabilities a consumer injects must be
// equally stable (module-level / useCallback / store-backed).
const NOOP = () => {};
const DEFAULT_APPEARANCE: ShellAppearance = { theme: "light", setTheme: NOOP, device: "auto" };
const EMPTY_SEARCH = async (): Promise<SearchHit[]> => [];
const EMPTY_CHAT = async function* (): AsyncGenerator<string> {};
const EMPTY_QUICKLINKS: QuickLinks = { items: [], open: NOOP, faviconUrl: () => null };

// Standalone defaults so the shell renders with zero capabilities injected
// (light theme, auto device, no wallpaper/CPU/search/stats/chat/server tile).
// Every member is defined so the accessors below always call a hook at a stable
// position regardless of what the consumer supplies.
const DEFAULT_CAPABILITIES: Required<ShellCapabilities> = {
  useAppearance: () => DEFAULT_APPEARANCE,
  useCpuPercent: () => null,
  useSearch: () => EMPTY_SEARCH,
  useSystemStats: () => null,
  useChat: () => EMPTY_CHAT,
  useServerToggle: () => null,
  useQuickLinks: () => EMPTY_QUICKLINKS,
};

const CapabilitiesContext = createContext<Required<ShellCapabilities>>(DEFAULT_CAPABILITIES);

export function CapabilitiesProvider({
  value,
  children,
}: {
  value?: ShellCapabilities;
  children: ReactNode;
}) {
  // Merge over the defaults so every capability key is a callable hook — keeps
  // the accessor hooks unconditional. Memoized on `value` so consumers don't
  // re-render on every provider render, and explicitly-undefined keys are
  // stripped first (otherwise `{ useSearch: undefined }` would override the
  // default and crash the unconditional accessor).
  const merged = useMemo<Required<ShellCapabilities>>(() => {
    const defined = Object.fromEntries(
      Object.entries(value ?? {}).filter(([, v]) => v !== undefined),
    ) as ShellCapabilities;
    return { ...DEFAULT_CAPABILITIES, ...defined };
  }, [value]);
  return (
    <CapabilitiesContext.Provider value={merged}>{children}</CapabilitiesContext.Provider>
  );
}

// Shell-internal accessors. They call the injected hook at a stable position
// (the capability object is provided once for the app's lifetime).
export function useShellAppearance(): ShellAppearance {
  return useContext(CapabilitiesContext).useAppearance();
}

export function useCpuPercent(): number | null {
  return useContext(CapabilitiesContext).useCpuPercent();
}

export function useShellSearch(): (query: string) => Promise<SearchHit[]> {
  return useContext(CapabilitiesContext).useSearch();
}

export function useSystemStats(): SystemStats | null {
  return useContext(CapabilitiesContext).useSystemStats();
}

export function useShellChat(): (messages: ChatMessage[]) => AsyncGenerator<string> {
  return useContext(CapabilitiesContext).useChat();
}

export function useServerToggle(): ServerToggle | null {
  return useContext(CapabilitiesContext).useServerToggle();
}

export function useQuickLinks(): QuickLinks {
  return useContext(CapabilitiesContext).useQuickLinks();
}
