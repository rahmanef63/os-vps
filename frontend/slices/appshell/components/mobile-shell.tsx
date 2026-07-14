"use client";

import { useCallback, useMemo, useState } from "react";
import { useUrlHome } from "../hooks/use-url-home";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useApps } from "../lib/registry";
import { useWindowOrder, useFocused, useWindow } from "../hooks/use-shell";
import { shellStore, openWindow, focusApp, minimizeWindow, restoreWindow, toggleSpotlight } from "../lib/store";
import { AppIcon } from "./app-icon";
import { HomeIndicator } from "./home-indicator";
import { WindowContent } from "./window-content";
import { MobileSwitcher } from "./mobile-switcher";
import { MobileHome } from "./mobile-home";
import { MobileNotifications } from "./mobile-notifications";
import { Slot } from "../registry/feature-registry";
import { useShellConfig } from "../registry/shell-config";
import { ShellUIProvider, type ShellUI } from "../registry/shell-ui";

// Phones: no floating windows — a paged home + one fullscreen app at a time.
// Reuses the same store (open/minimize/focus) so state matches the desktop.
export function MobileShell() {
  const apps = useApps();
  const order = useWindowOrder();
  const focused = useFocused();
  const [switcher, setSwitcher] = useState(false);
  const [cc, setCc] = useState(false);
  const [nc, setNc] = useState(false); // notification center (pull down, left half)
  const [appScrolled, setAppScrolled] = useState(false); // iOS nav-bar frost-on-scroll

  // Dock = manifest-pinned apps (AppDescriptor.pinned — the generic shell never
  // hardcodes project app ids); falls back to the first 4 dockable apps.
  const dockApps = useMemo(() => {
    const pinned = apps.filter((a) => a.pinned);
    return (pinned.length ? pinned : apps.filter((a) => !a.noDock)).slice(0, 4);
  }, [apps]);

  // URL → surface: a pathname naming an app slug shows the app pane (UrlSync
  // opens/focuses its window in the shared store; we only flip off the grid),
  // anything else shows the grid — covers initial deep links AND back/forward.
  // User gestures (launch/Done) override, keyed to the pathname they were made
  // at, so the derivation wins again when the URL actually changes — no
  // effect-driven setState (react-hooks/set-state-in-effect). Gated like
  // UrlSync (manifest.routing): opted out, the URL never names an app, so the
  // grid-first default + gesture overrides behave exactly as before.
  const { routing } = useShellConfig();
  const { home, setHome } = useUrlHome(apps, routing);

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
  // Resume-don't-duplicate (real-iOS): a home tap brings the existing window
  // forward; only a missing one spawns — multi apps get extra windows from
  // explicit affordances (dock hover "New Window" on desktop), not home taps.
  const launch = useCallback(
    (app: (typeof apps)[number]) => {
      if (!focusApp(app.id)) openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
      setSwitcher(false);
      setHome(false);
      setAppScrolled(false); // fresh app opens at the top → clear the nav-bar frost
    },
    [setHome],
  );
  const launchById = useCallback(
    (appId: string) => {
      const app = apps.find((a) => a.id === appId);
      if (app) launch(app);
    },
    [apps, launch],
  );
  const resume = (id: string) => {
    restoreWindow(id);
    setSwitcher(false);
    setHome(false);
    setAppScrolled(false);
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
    setAppScrolled(false);
  };

  const quickAppIds = useMemo(() => dockApps.map((a) => a.id), [dockApps]);
  const shellUI = useMemo<ShellUI>(
    () => ({
      controlCenterOpen: cc,
      setControlCenterOpen: setCc,
      openApp: launch,
      openAppById: launchById,
      quickAppIds,
    }),
    [cc, launch, launchById, quickAppIds],
  );

  return (
    <ShellUIProvider value={shellUI}>
      <div className="absolute inset-0 z-[10] flex flex-col">
      {/* Home is inert while an app covers it (a11y: its grid, pager pages and
          home-indicator otherwise stay in tab/AT order under the opaque app
          layer). It stays visually mounted for the appOpen zoom. */}
      <MobileHome
        apps={apps}
        dockApps={dockApps}
        inactive={!!(showApp && activeApp)}
        onLaunch={launch}
        onSearch={toggleSpotlight}
        onControlCenter={() => setCc(true)}
        onNotifications={() => setNc(true)}
        indicator={<HomeIndicator onHome={goHome} onSwitcher={openSwitcher} onSwitchApp={switchApp} />}
      />

      {/* APP fullscreen */}
      {showApp && activeApp && (
        <div
          className="absolute inset-0 z-[10] flex flex-col [animation:appOpen_var(--shell-dur-slow)_var(--shell-ease)] [transform-origin:center_bottom]"
          style={{ background: "var(--surface)" }}
        >
          {/* Nav bar: transparent at rest, frosting into a hairline glass bar once
              the app scrolls (onScrollCapture on <main> catches the app's own inner
              scroll container generically). Title stays put — os-vps apps carry no
              in-content large title to fade in. */}
          <header
            className={cn(
              "flex shrink-0 items-center gap-2.5 border-b px-3.5 transition-[background-color,border-color] duration-200",
              appScrolled ? "border-border bg-[var(--glass-bar)] backdrop-blur-xl" : "border-transparent bg-transparent",
            )}
            style={{ height: "calc(3rem + var(--sai-top))", paddingTop: "var(--sai-top)" }}
          >
            <span className="size-[30px] shrink-0">
              <AppIcon app={activeApp} />
            </span>
            <strong className="flex-1 truncate text-base">{activeApp.title}</strong>
            {/* primary exit control — text keeps it wide; bump height to the 44pt HIG touch target */}
            <Button type="button" variant="ghost" onClick={goHome} className="h-11 min-w-11 rounded-md px-3 text-sm font-medium text-primary">
              Done
            </Button>
          </header>
          {/* The home-indicator overlays the content edge-to-edge (real-iOS), so
              raise --sai-bottom INSIDE the app pane to include its 34px zone —
              every app already pads with var(--sai-bottom), so bumping the var
              clears the pill centrally without double-padding anyone. */}
          <main
            onScrollCapture={(e) => setAppScrolled((e.target as HTMLElement).scrollTop > 4)}
            className="relative min-h-0 flex-1 overflow-auto [container-type:inline-size]"
            style={{ "--sai-bottom": "calc(env(safe-area-inset-bottom, 0px) + 34px)" } as React.CSSProperties}
          >
            <WindowContent app={top.app} payload={top.payload} />
          </main>
          <div className="absolute inset-x-0 bottom-0 z-[5]">
            <HomeIndicator light={false} onHome={goHome} onSwitcher={openSwitcher} onSwitchApp={switchApp} />
          </div>
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
