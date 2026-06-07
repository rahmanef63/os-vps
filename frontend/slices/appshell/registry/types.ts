import type { ComponentType, ReactNode } from "react";
import type { AppDescriptor } from "../lib/types";
import type { ShellCapabilities } from "./capabilities";
import type { ShellId } from "./shells";

// Named regions a feature can mount into. The surfaces render <Slot region> at a
// fixed spot; which component fills it comes from the registered features. This
// is what makes the shell config-driven: add/remove a feature = manifest edit,
// no surface edit (open/closed).
export type SlotRegion =
  | "overlay" // full-screen overlays (e.g. command palette) — desktop + mobile
  | "rightPanel" // desktop right dock (e.g. inspector)
  | "notifications" // transient toast stack — desktop + mobile
  | "topPill" // mobile top-center status pill (e.g. dynamic island)
  | "controlCenter" // mobile pull-down control center
  | "menuBarStatus" // desktop menu-bar trailing cluster (e.g. control center)
  | "today" // mobile widgets / today page
  | "desktopWidgets"; // desktop wallpaper-layer widget stack (behind windows)

/**
 * A pluggable shell feature (search, inspector, notifications, control-center,
 * widgets, settings…). Contributed by a `shell-*` slice via `defineFeature`.
 * appshell core never imports features — the consumer's manifest injects them.
 */
export type FeatureDescriptor = {
  id: string;
  /** Components mounted into named surface regions. */
  slots?: Partial<Record<SlotRegion, ComponentType>>;
  /** Optional context provider the feature needs wrapped around the shell. */
  provider?: ComponentType<{ children: ReactNode }>;
  /** System default (search/inspector/notifications/control-center/widgets) vs
   *  a custom feature added by the host. Documents provenance; default "system". */
  kind?: "system" | "custom";
};

export type Brand = {
  name: string;
  /** Glyph/text/element for the menu-bar logo badge. */
  logo?: ReactNode;
  /** Default wallpaper key (overrides the appearance default). */
  wallpaper?: string;
  /** Menu-bar title when no app is focused (macOS shows "Finder"). */
  idleAppName?: string;
};

/** The whole-project config the shell is driven by. */
export type ShellManifest = {
  brand: Brand;
  apps: AppDescriptor[];
  features?: FeatureDescriptor[];
  /** localStorage namespace for persisted shell state (window layout). */
  persistKey?: string;
  /** Consumer-injected capabilities (appearance/host) — keeps the shell generic. */
  capabilities?: ShellCapabilities;
  /** Mirror focused app + deep path to the URL (catch-all route). Default on. */
  routing?: boolean;
  /** Sync document.title to the focused window ("App — Brand"). Default on. */
  titleSync?: boolean;
  /** Initial shell (macOS/Windows/Dashboard/…). Unset = responsive auto. The
   *  user's live choice (Settings → Shell) overrides this and persists. */
  shell?: ShellId;
};

/** Identity helper — gives a feature its type + a stable authoring shape. */
export function defineFeature(feature: FeatureDescriptor): FeatureDescriptor {
  return feature;
}
