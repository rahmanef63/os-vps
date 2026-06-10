"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ResponsiveContext,
  type DeviceMode,
  type Pane,
  type Responsive,
  type SafeArea,
} from "./use-responsive";

export const MOBILE_W = 768; // phone-width cutoff — THE breakpoint (useIsMobile fallback imports it)
const TABLET_W = 1024; // touch-portrait tablets below this read as mobile

function bucket(vw: number): Pane {
  if (vw < 480) return "xs";
  if (vw < MOBILE_W) return "sm";
  if (vw < TABLET_W) return "md";
  return "lg";
}

function readSafeArea(): SafeArea {
  if (typeof window === "undefined") return { top: 0, right: 0, bottom: 0, left: 0 };
  const s = getComputedStyle(document.documentElement);
  const px = (v: string) => parseInt(s.getPropertyValue(v)) || 0;
  return {
    top: px("--sai-top"),
    right: px("--sai-right"),
    bottom: px("--sai-bottom"),
    left: px("--sai-left"),
  };
}

// Deterministic SSR/first-paint default: desktop, so the window manager renders
// until the on-mount measurement corrects it (same no-flash behaviour the old
// inline useIsMobile had — it treated "unknown" as not-mobile).
function initial(device: DeviceMode): Responsive {
  const forced = device === "phone";
  return {
    formFactor: forced ? "mobile" : "desktop",
    isMobile: forced,
    device,
    vw: 1024,
    vh: 768,
    pointer: "fine",
    orientation: "landscape",
    breakpoint: "lg",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

/**
 * Computes the responsive state once and provides it to the whole shell. Ports
 * the old desktop.tsx `useIsMobile` logic: auto = phone-width OR a coarse-pointer
 * portrait tablet. `device` (from the consumer/appearance) can force phone/desktop.
 */
export function ResponsiveProvider({
  device = "auto",
  children,
}: {
  device?: DeviceMode;
  children: ReactNode;
}) {
  const [state, setState] = useState<Responsive>(() => initial(device));

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      const portrait = vh >= vw;
      const auto = vw < MOBILE_W || (coarse && portrait && vw < TABLET_W);
      const isMobile = device === "phone" ? true : device === "desktop" ? false : auto;
      setState({
        formFactor: isMobile ? "mobile" : "desktop",
        isMobile,
        device,
        vw,
        vh,
        pointer: coarse ? "coarse" : "fine",
        orientation: portrait ? "portrait" : "landscape",
        breakpoint: bucket(vw),
        safeArea: readSafeArea(),
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, [device]);

  return <ResponsiveContext.Provider value={state}>{children}</ResponsiveContext.Provider>;
}
