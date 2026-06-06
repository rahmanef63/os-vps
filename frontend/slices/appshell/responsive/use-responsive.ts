"use client";

import { createContext, useContext } from "react";

export type FormFactor = "desktop" | "mobile";
export type DeviceMode = "auto" | "desktop" | "phone";
/** Viewport/container size bucket, smallest → largest. */
export type Pane = "xs" | "sm" | "md" | "lg";

export type SafeArea = { top: number; right: number; bottom: number; left: number };

/**
 * The single source of truth for "how big / what kind of device am I". Computed
 * once by <ResponsiveProvider> and read anywhere via useResponsive(). Replaces
 * the ad-hoc inline `useIsMobile` (surface choice) so there is exactly one
 * responsive contract; the graceful `useIsMobile` lives in `use-is-mobile.ts`.
 */
export type Responsive = {
  /** Which whole-shell surface to render. */
  formFactor: FormFactor;
  /** Convenience: formFactor === "mobile". */
  isMobile: boolean;
  /** The consumer's device override (auto | desktop | phone). */
  device: DeviceMode;
  vw: number;
  vh: number;
  pointer: "coarse" | "fine";
  orientation: "portrait" | "landscape";
  /** Viewport size bucket (use container queries for pane-level layout). */
  breakpoint: Pane;
  /** env(safe-area-inset-*) in px (notch / home bar). */
  safeArea: SafeArea;
};

export const ResponsiveContext = createContext<Responsive | null>(null);

/** Read the shell's responsive state. Must be inside <ResponsiveProvider>. */
export function useResponsive(): Responsive {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) {
    throw new Error("useResponsive must be used within <ResponsiveProvider>");
  }
  return ctx;
}
