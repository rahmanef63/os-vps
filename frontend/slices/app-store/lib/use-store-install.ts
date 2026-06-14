"use client";

import { useCallback, useState } from "react";

import { setInstalled } from "./apps-store";
import { setEnabled } from "./enabled-store";
import type { CatalogApp } from "./store-catalog";
import type { SystemEntry } from "./system-catalog";

// Install/uninstall state machine for the App Store. Touch users have no
// hover affordance, so tapping the "Installed" pill instantly fires uninstall —
// that's the destructive path we gate behind a confirm. Install is instant.
// Returns the toggles cards bind to, the busy id (per-card spinner), the
// pending entries (drive the dialogs), and the confirm callbacks.
export function useStoreInstall(off: Set<string>) {
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingApp, setPendingApp] = useState<CatalogApp | null>(null);
  const [pendingSystem, setPendingSystem] = useState<SystemEntry | null>(null);

  const doInstall = useCallback(async (app: CatalogApp, nextInstalled: boolean) => {
    setBusy(app.appId);
    try {
      setInstalled({
        appId: app.appId,
        installed: nextInstalled,
        title: app.title,
        glyph: app.glyph,
        gradient: app.gradient,
        runtime: app.runtime,
        entry: app.entry,
      });
    } finally {
      setBusy(null);
    }
  }, []);

  const toggle = useCallback(
    (app: CatalogApp) => {
      if (app.installed) setPendingApp(app);
      else void doInstall(app, true);
    },
    [doInstall],
  );

  const toggleSystem = useCallback(
    (e: SystemEntry) => {
      const currentlyInstalled = !off.has(e.id);
      // Confirm before disabling, instant on re-enable (not destructive).
      if (currentlyInstalled) setPendingSystem(e);
      else setEnabled(e.id, true);
    },
    [off],
  );

  const confirmUninstallApp = useCallback(() => {
    if (pendingApp) void doInstall(pendingApp, false);
    setPendingApp(null);
  }, [doInstall, pendingApp]);

  const confirmUninstallSystem = useCallback(() => {
    if (pendingSystem) setEnabled(pendingSystem.id, false);
    setPendingSystem(null);
  }, [pendingSystem]);

  return {
    busy,
    pendingApp,
    pendingSystem,
    toggle,
    toggleSystem,
    cancelApp: () => setPendingApp(null),
    cancelSystem: () => setPendingSystem(null),
    confirmUninstallApp,
    confirmUninstallSystem,
  };
}
