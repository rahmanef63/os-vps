"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppDescriptor } from "../lib/types";

// Surface-provided callbacks/state that mobile-only feature slots consume in
// place of props. Lets the mobile surface keep owning its local UI state
// (home/switcher/control-center) while slotted features (control-center,
// dynamic-island, widgets) read what they need — behaviour-neutral vs the old
// prop wiring, but decoupled so the features live in their own slices.
export type ShellUI = {
  controlCenterOpen: boolean;
  setControlCenterOpen: (open: boolean) => void;
  /** Open/resume an app fullscreen (mobile launch semantics). */
  openApp: (app: AppDescriptor) => void;
  openAppById: (id: string) => void;
  /** App ids surfaced as quick shortcuts (the mobile dock set). */
  quickAppIds: string[];
};

const ShellUIContext = createContext<ShellUI | null>(null);

export function ShellUIProvider({
  value,
  children,
}: {
  value: ShellUI;
  children: ReactNode;
}) {
  return <ShellUIContext.Provider value={value}>{children}</ShellUIContext.Provider>;
}

export function useShellUI(): ShellUI {
  const ctx = useContext(ShellUIContext);
  if (!ctx) throw new Error("useShellUI must be used within the mobile shell surface");
  return ctx;
}
