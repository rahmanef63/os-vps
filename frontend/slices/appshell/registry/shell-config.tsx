"use client";

import { createContext, useContext, type ReactNode } from "react";

// Non-brand runtime config the shell core needs (kept out of Brand so brand
// stays purely presentational): the persistence namespace (so a generic
// appshell never hardcodes a consumer's localStorage key) + the routing flag
// (mirrors manifest.routing so surfaces beyond UrlSync — e.g. the mobile
// shell's deep-link handling — gate on the same opt-out).
export type ShellConfig = {
  persistKey: string;
  routing?: boolean;
};

const ShellConfigContext = createContext<ShellConfig>({ persistKey: "appshell:layout", routing: true });

export function ShellConfigProvider({
  value,
  children,
}: {
  value: ShellConfig;
  children: ReactNode;
}) {
  return <ShellConfigContext.Provider value={value}>{children}</ShellConfigContext.Provider>;
}

export function useShellConfig(): ShellConfig {
  return useContext(ShellConfigContext);
}
