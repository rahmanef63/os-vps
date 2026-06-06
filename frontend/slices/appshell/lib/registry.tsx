"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppDescriptor } from "./types";

// Apps are injected by the app layer, not imported by os-shell (open/closed).
const RegistryContext = createContext<Map<string, AppDescriptor>>(new Map());

export function AppRegistryProvider({
  apps,
  children,
}: {
  apps: AppDescriptor[];
  children: ReactNode;
}) {
  const map = new Map(apps.map((a) => [a.id, a]));
  return (
    <RegistryContext.Provider value={map}>{children}</RegistryContext.Provider>
  );
}

export function useApps(): AppDescriptor[] {
  return Array.from(useContext(RegistryContext).values());
}

export function useApp(id: string): AppDescriptor | undefined {
  return useContext(RegistryContext).get(id);
}
