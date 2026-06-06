"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { openWindow, focusApp, shellStore } from "../lib/store";
import { useFocused, useWindow } from "../hooks/use-shell";
import type { AppDescriptor } from "../lib/types";

// Maps the OS window model onto a single URL: the FOCUSED app (+ its launch
// path) is reflected as `/<slug>/<path>`. Windowing is untouched — many windows
// stay open; only the focused one is addressable. Deep links + back/forward
// work. Generic: a project's app slugs drive it, appshell owns no routes itself.
//
// State → URL uses the native History API, NOT router.push: opening a window is
// pure client state, so we just rewrite the address bar (Next syncs usePathname
// to it) — no RSC roundtrip, no remount, instant. Real navigation (deep links,
// ⌘/middle-click on the dock <Link>, back/forward) still loads/repaints normally.
//
// The two effects fire on DIFFERENT triggers and never on each other's:
//   • state → URL reacts to focus/payload, reads the latest pathname from a ref
//     so OUR own address-bar rewrite doesn't re-trigger it.
//   • URL → state reacts to the pathname (incl. popstate from back/forward),
//     reads the focused app LIVE from the store (not a dep) so a focus change
//     can't re-run it and fight the rewrite.

function payloadPath(payload: unknown): string {
  const p = (payload as { path?: unknown } | null)?.path;
  return typeof p === "string" && p ? "/" + p.replace(/^\/+/, "") : "";
}

function stateToUrl(apps: AppDescriptor[], appId: string | null, payload: unknown): string {
  if (!appId) return "/";
  const app = apps.find((a) => a.id === appId);
  if (!app) return "/";
  return "/" + (app.slug ?? app.id) + payloadPath(payload);
}

function urlToApp(
  apps: AppDescriptor[],
  pathname: string,
): { app: AppDescriptor; path?: string } | null {
  const segs = pathname.split("/").filter(Boolean);
  if (!segs.length) return null;
  const [slug, ...rest] = segs;
  const app = apps.find((a) => (a.slug ?? a.id) === slug);
  if (!app) return null;
  return { app, path: rest.length ? "/" + rest.join("/") : undefined };
}

function focusedAppId(): string | null {
  return shellStore.getWindow(shellStore.getFocused() ?? "")?.app ?? null;
}

/** Two-way focused-app ⇄ URL sync. Rendered (null) inside <AppShell>. */
export function UrlSync({ apps }: { apps: AppDescriptor[] }) {
  const pathname = usePathname();
  const focused = useFocused();
  const win = useWindow(focused ?? "");
  const focusedApp = win?.app ?? null;
  const payload = win?.payload;

  const pathnameRef = useRef(pathname);
  const booted = useRef(false);
  const prevApp = useRef<string | null>(null);
  // Latest-ref mirror; declared BEFORE the sync effects so it commits first
  // each render cycle (effects run in declaration order).
  useEffect(() => {
    pathnameRef.current = pathname;
  });

  // State → URL. push on app change (so back/forward walks focus history),
  // replace on same-app path tweaks. The first pass only records the baseline
  // so a deep-linked URL isn't clobbered before URL→state opens its window.
  useEffect(() => {
    const target = stateToUrl(apps, focusedApp, payload);
    if (!booted.current || target === pathnameRef.current) {
      booted.current = true;
      prevApp.current = focusedApp;
      return;
    }
    // pushState on app change (so back/forward walks focus history), replaceState
    // on same-app path tweaks. usePathname tracks the History API in Next 16.
    if (focusedApp && focusedApp !== prevApp.current) {
      window.history.pushState(null, "", target);
    } else {
      window.history.replaceState(null, "", target);
    }
    pathnameRef.current = target;
    prevApp.current = focusedApp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedApp, payload]);

  // URL → state: open/focus the app named in the URL (deep link + back/forward).
  // Reads the focused app live so a focus change can't re-enter this effect.
  useEffect(() => {
    const target = urlToApp(apps, pathname);
    if (!target || target.app.id === focusedAppId()) return;
    // Focus an existing window rather than spawn one — else a `multi` app (Files)
    // would open a duplicate on every back/forward.
    if (focusApp(target.app.id)) return;
    openWindow(
      target.app.id,
      target.app.title,
      target.app.defaultSize,
      target.path ? { path: target.path } : undefined,
    );
  }, [pathname, apps]);

  return null;
}
