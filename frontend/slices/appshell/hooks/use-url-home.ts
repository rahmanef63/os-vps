"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppDescriptor } from "../lib/types";

// URL → "show Home (no app pane)?" derivation, shared by the iOS / Android /
// Dashboard shells. A pathname naming an app slug shows that app's pane (UrlSync
// opens/focuses its window in the store); user gestures override, keyed to the
// pathname they were made at, so the derivation wins again when the URL actually
// changes — no effect-driven setState (react-hooks/set-state-in-effect). Gated
// on manifest.routing: opted out, the URL never names an app and Home stays the
// default with gesture overrides intact.
export function useUrlHome(apps: AppDescriptor[], routing?: boolean) {
  const pathname = usePathname();
  const urlSlug = pathname.split("/").filter(Boolean)[0];
  const urlIsApp =
    routing !== false && !!urlSlug && apps.some((a) => (a.slug ?? a.id) === urlSlug);
  const [homeChoice, setHomeChoice] = useState<{ key: string; home: boolean } | null>(null);
  const home = homeChoice?.key === pathname ? homeChoice.home : !urlIsApp;
  const setHome = useCallback(
    (h: boolean) => setHomeChoice({ key: pathname, home: h }),
    [pathname],
  );
  return { home, setHome };
}
