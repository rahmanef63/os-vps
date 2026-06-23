"use client";
/* Android (Material-You) mobile shell — same store + apps as every other shell,
   one fullscreen app at a time (mirrors MobileShell). Chrome: pull-DOWN on the
   home surface → the REAL Control Center feature (controlCenter slot; the old
   fake Shade is gone), big clock + date on the wallpaper, search pill →
   Spotlight, swipe-up App Drawer, gesture nav (back / home / recents), and a
   Recents card deck. Transparent root: the shared <Wallpaper> (auto →
   wp-material, or the user's custom image) shows through, like every other
   shell. Bottom inset system: the root sets `--android-nav` (NavBar row
   height); every surface that must clear the bottom chrome pads with
   `calc(var(--android-nav) + var(--sai-bottom))`. */
import { Button } from "@/components/ui/button";
import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { useUrlHome } from "../../../hooks/use-url-home";
import { Search, ChevronLeft, Bot } from "lucide-react";
import { useApps } from "../../../lib/registry";
import { usePullDown } from "../../../hooks/use-pull-down";
import { useWindowOrder, useFocused, useWindow } from "../../../hooks/use-shell";
import { shellStore, openWindow, focusApp, minimizeWindow, restoreWindow, toggleSpotlight } from "../../../lib/store";
import { WindowContent } from "../../window-content";
import { registerShell } from "../../../registry/shells";
import { Slot } from "../../../registry/feature-registry";
import { useShellConfig } from "../../../registry/shell-config";
import { ShellUIProvider, type ShellUI } from "../../../registry/shell-ui";
import { Clock } from "../../clock";
import { AppCell, AppDrawer, NavBar, Recents } from "./android-parts";
import { ShellContextMenu, useShellContextMenu } from "../context-menu";
import type { AppDescriptor } from "../../../lib/types";

function AndroidShell() {
  const apps = useApps();
  const order = useWindowOrder();
  const focused = useFocused();
  const [drawer, setDrawer] = useState(false);
  const [cc, setCc] = useState(false); // control center (pull down on home)
  const [recents, setRecents] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // URL → surface (same derivation as the iOS shell): a pathname naming an app
  // slug shows the app pane (UrlSync opens/focuses its window in the store);
  // user gestures override, keyed to the pathname they were made at — covers
  // initial deep links AND back/forward without effect-driven setState.
  const { routing } = useShellConfig();
  const { home, setHome } = useUrlHome(apps, routing);

  const dockable = useMemo(() => apps.filter((a) => !a.noDock), [apps]);
  const pinned = useMemo(() => dockable.filter((a) => a.pinned), [dockable]);
  const topId =
    focused && !shellStore.getWindow(focused)?.minimized
      ? focused
      : ([...order].reverse().find((id) => !shellStore.getWindow(id)?.minimized) ?? null);
  const top = useWindow(topId ?? "__none__"); // reactive: re-renders on the active window's own payload/title changes
  const showApp = !home && !!top;
  const activeApp = top ? apps.find((a) => a.id === top.app) : null;

  const launch = useCallback(
    (app: AppDescriptor) => {
      // Resume-don't-duplicate (real-Android): a home/drawer tap brings the
      // existing window forward; only a missing one spawns.
      if (!focusApp(app.id)) openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
      setDrawer(false);
      setRecents(false);
      setHome(false);
    },
    [setHome],
  );
  const launchById = useCallback(
    (id: string) => {
      const app = apps.find((a) => a.id === id);
      if (app) launch(app);
    },
    [apps, launch],
  );
  const goHome = () => {
    if (topId) minimizeWindow(topId);
    setHome(true);
    setDrawer(false);
    setRecents(false);
  };
  const resume = (id: string) => {
    restoreWindow(id);
    setRecents(false);
    setHome(false);
  };
  // Pull-DOWN anywhere on home opens the Control Center (no status-bar row).
  // The app grid keeps scrolling: the pull only arms while the grid is at top.
  const pullDown = usePullDown(() => setCc(true), gridRef);
  // Home-background long-press / right-click → this shell's registry menu
  // (native long-press fires contextmenu; controls are skipped).
  const menu = useShellContextMenu("android", "mobile");
  const onHomeContext = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input")) return;
    menu.open(e);
  };

  const quickAppIds = useMemo(
    () => (pinned.length ? pinned : dockable.slice(0, 4)).map((a) => a.id),
    [pinned, dockable],
  );
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
      <div
        className="absolute inset-0 z-[10] flex flex-col overflow-hidden text-foreground"
        style={{ "--android-nav": "48px" } as CSSProperties}
      >
        {/* HOME (always mounted; app overlays it — inert while covered so its
            grid + NavBar drop out of tab/AT order under the z-20 app layer).
            Pull down → Control Center; clock+date live on the wallpaper. */}
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-1" inert={showApp} aria-hidden={showApp} onPointerDown={pullDown} onContextMenu={onHomeContext} style={{ paddingTop: "var(--sai-top, 0px)" }}>
          <div className="mt-6 shrink-0">
            <Clock mode="big" />
            <Clock mode="date" />
          </div>
          <button
            type="button"
            onClick={toggleSpotlight}
            className="mt-4 flex h-11 shrink-0 items-center gap-3 rounded-full border border-border bg-card/80 px-4 text-left shadow-sm backdrop-blur"
          >
            <Search className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search</span>
          </button>
          <div ref={gridRef} className="mt-6 grid min-h-0 grid-cols-4 content-start gap-x-3 gap-y-5 overflow-y-auto">
            {dockable.slice(0, 12).map((a) => (
              <AppCell key={a.id} app={a} onClick={() => launch(a)} />
            ))}
          </div>
          <Button type="button" variant="ghost"
            onClick={() => setDrawer(true)}
            className="h-auto p-0 font-normal hover:bg-transparent mx-auto mb-1 mt-auto flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground"
          >
            <span className="h-1 w-9 rounded-full bg-foreground/30" />
            All apps
          </Button>
        </div>

        <NavBar inactive={showApp} onBack={goHome} onHome={goHome} onRecents={() => setRecents(true)} />

        {/* fullscreen app */}
        {showApp && activeApp && top && (
          <div className="absolute inset-0 z-[20] flex flex-col bg-background [animation:appOpen_var(--shell-dur)_var(--shell-ease)] [transform-origin:center_bottom]">
            <header
              className="flex shrink-0 items-center gap-3 px-3 text-white"
              style={{ background: activeApp.gradient, height: "calc(3rem + var(--sai-top, 0px))", paddingTop: "var(--sai-top, 0px)" }}
            >
              <Button type="button" variant="ghost" onClick={goHome} aria-label="Back" className="h-auto p-0 font-normal hover:bg-transparent"><ChevronLeft className="size-5" /></Button>
              <strong className="flex-1 truncate text-base">{activeApp.title}</strong>
            </header>
            <main className="relative min-h-0 flex-1 overflow-auto [container-type:inline-size]">
              <WindowContent app={top.app} payload={top.payload} />
            </main>
            <NavBar onBack={goHome} onHome={goHome} onRecents={() => setRecents(true)} />
          </div>
        )}

        {drawer && <AppDrawer apps={dockable} onLaunch={launch} onClose={() => setDrawer(false)} />}
        {recents && <Recents order={order} apps={apps} onResume={resume} onHome={goHome} />}
        <Slot region="controlCenter" />
        <ShellContextMenu state={menu.state} onClose={menu.close} />
      </div>
    </ShellUIProvider>
  );
}

registerShell({
  id: "android",
  label: "Android",
  icon: Bot,
  surface: "mobile",
  group: "Mobile",
  wallpaper: "material",
  render: AndroidShell,
});

export { AndroidShell };
