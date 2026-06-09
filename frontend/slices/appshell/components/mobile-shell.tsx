"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApps } from "../lib/registry";
import { useWindowOrder, useFocused, useWindow } from "../hooks/use-shell";
import { shellStore, openWindow, minimizeWindow, restoreWindow, toggleSpotlight } from "../lib/store";
import { AppIcon } from "./app-icon";
import { HomeIndicator } from "./home-indicator";
import { WindowContent } from "./window-content";
import { MobileSwitcher } from "./mobile-switcher";
import { MobileHome } from "./mobile-home";
import { MobileNotifications } from "./mobile-notifications";
import { Slot } from "../registry/feature-registry";
import { useShellConfig } from "../registry/shell-config";
import { ShellUIProvider, type ShellUI } from "../registry/shell-ui";

const DOCK_IDS = ["files-manager", "os-terminal", "system-monitor", "os-settings"];

// Phones: no floating windows — a paged home + one fullscreen app at a time.
// Reuses the same store (open/minimize/focus) so state matches the desktop.
export function MobileShell() {
  const apps = useApps();
  const order = useWindowOrder();
  const focused = useFocused();
  const [switcher, setSwitcher] = useState(false);
  const [cc, setCc] = useState(false);
  const [nc, setNc] = useState(false); // notification center (pull down, left half)

  const dockApps = apps.filter((a) => DOCK_IDS.includes(a.id));

  // URL → surface: a pathname naming an app slug shows the app pane (UrlSync
  // opens/focuses its window in the shared store; we only flip off the grid),
  // anything else shows the grid — covers initial deep links AND back/forward.
  // User gestures (launch/Done) override, keyed to the pathname they were made
  // at, so the derivation wins again when the URL actually changes — no
  // effect-driven setState (react-hooks/set-state-in-effect). Gated like
  // UrlSync (manifest.routing): opted out, the URL never names an app, so the
  // grid-first default + gesture overrides behave exactly as before.
  const { routing } = useShellConfig();
  const pathname = usePathname();
  const urlSlug = pathname.split("/").filter(Boolean)[0];
  const urlIsApp =
    routing !== false && !!urlSlug && apps.some((a) => (a.slug ?? a.id) === urlSlug);
  const [homeChoice, setHomeChoice] = useState<{ key: string; home: boolean } | null>(null);
  const home = homeChoice?.key === pathname ? homeChoice.home : !urlIsApp;
  const setHome = (h: boolean) => setHomeChoice({ key: pathname, home: h });

  // The visible app is the FOCUSED window (front-most) — fall back to the newest
  // non-minimized one. `order` is append-only and doesn't track focus.
  const topId =
    focused && !shellStore.getWindow(focused)?.minimized
      ? focused
      : ([...order].reverse().find((id) => !shellStore.getWindow(id)?.minimized) ?? null);
  const top = useWindow(topId ?? "__none__"); // reactive: re-renders on the active window's own payload/title changes
  const showApp = !home && top;
  const activeApp = top ? apps.find((a) => a.id === top.app) : null;

  // SSOT navigation: open / resume bring a window to the front; home minimises.
  const launch = (app: (typeof apps)[number]) => {
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    setSwitcher(false);
    setHome(false);
  };
  const launchById = (appId: string) => {
    const app = apps.find((a) => a.id === appId);
    if (app) launch(app);
  };
  const resume = (id: string) => {
    restoreWindow(id);
    setSwitcher(false);
    setHome(false);
  };
  const goHome = () => {
    if (topId) minimizeWindow(topId);
    setSwitcher(false);
    setHome(true);
  };

  const openSwitcher = () => setSwitcher(true);

  // Horizontal home-bar swipe → cycle the open (non-minimized) apps, iOS-style.
  const switchApp = (dir: -1 | 1) => {
    const live = order.filter((id) => !shellStore.getWindow(id)?.minimized);
    if (live.length < 2 || !topId) return;
    const next = live[(live.indexOf(topId) + dir + live.length) % live.length];
    restoreWindow(next);
    setHome(false);
  };

  const shellUI: ShellUI = {
    controlCenterOpen: cc,
    setControlCenterOpen: setCc,
    openApp: launch,
    openAppById: launchById,
    quickAppIds: dockApps.map((a) => a.id),
  };

  return (
    <ShellUIProvider value={shellUI}>
      <div className="absolute inset-0 z-[10] flex flex-col">
      <MobileHome
        apps={apps}
        dockApps={dockApps}
        onLaunch={launch}
        onSearch={toggleSpotlight}
        onControlCenter={() => setCc(true)}
        onNotifications={() => setNc(true)}
        indicator={<HomeIndicator onHome={goHome} onSwitcher={openSwitcher} onSwitchApp={switchApp} />}
      />

      {/* APP fullscreen */}
      {showApp && activeApp && (
        <div
          className="absolute inset-0 z-[10] flex flex-col [animation:appOpen_.28s_cubic-bezier(.2,.8,.2,1)] [transform-origin:center_bottom]"
          style={{ background: "var(--surface)" }}
        >
          <header
            className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5"
            style={{ background: "var(--glass-bar)", height: "calc(3rem + var(--sai-top))", paddingTop: "var(--sai-top)" }}
          >
            <span className="size-[30px] shrink-0">
              <AppIcon app={activeApp} />
            </span>
            <strong className="flex-1 truncate text-base">{activeApp.title}</strong>
            <Button type="button" variant="ghost" onClick={goHome} className="h-auto rounded-md px-3 py-1 text-sm font-medium text-primary">
              Done
            </Button>
          </header>
          <main className="relative min-h-0 flex-1 overflow-auto [container-type:inline-size]">
            <WindowContent app={top.app} payload={top.payload} />
          </main>
          <HomeIndicator light={false} onHome={goHome} onSwitcher={openSwitcher} onSwitchApp={switchApp} />
        </div>
      )}

      {switcher && <MobileSwitcher onPick={resume} onHome={goHome} />}
      <MobileNotifications open={nc} onClose={() => setNc(false)} />
      <Slot region="controlCenter" />
      <Slot region="topPill" />
      </div>
    </ShellUIProvider>
  );
}
