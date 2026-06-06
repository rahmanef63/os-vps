"use client";

import { useMemo } from "react";
import type { AppDescriptor } from "./host";
import { glyphIcon } from "./glyph";
import { RuntimeApp, type AppManifest } from "../components/runtime-app";
import { useApps } from "./apps-store";

// Turns the owner's installed runtime apps (localStorage) into AppDescriptors
// the shell can mount — merged with the built-in slices by the app layer. This
// is the "dynamic" half of the registry: create/install an app → it appears live.
export function useInstalledApps(): AppDescriptor[] {
  const apps = useApps().filter((a) => a.installed);
  // Stable signature so descriptors (and their lazy components) only change
  // when the underlying app data actually changes — no remount churn.
  const sig = apps
    .map((a) => `${a.appId}:${a.title}:${a.glyph}:${a.gradient}:${a.runtime}:${a.entry}`)
    .join("|");

  return useMemo(() => {
    return apps.map((a): AppDescriptor => {
      const manifest: AppManifest = {
        title: a.title,
        runtime: a.runtime,
        entry: a.entry,
        source: a.source,
      };
      const Comp = () => RuntimeApp({ manifest });
      Comp.displayName = `Runtime(${a.appId})`;
      return {
        id: a.appId,
        title: a.title,
        icon: glyphIcon(a.glyph),
        gradient: a.gradient,
        load: () => Promise.resolve({ default: Comp }),
        defaultSize: { w: 640, h: 460 },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
}
