"use client";

import { useCallback, useMemo, useState } from "react";
import { useUrlHome } from "../hooks/use-url-home";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { useApps } from "../lib/registry";
import { useInspectorInfo } from "../lib/inspector";
import { AppActionsSheet } from "./app-actions-sheet";
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
  const [closing, setClosing] = useState(false); // playing the dismiss-to-home zoom
  const [actionsOpen, setActionsOpen] = useState(false); // in-app "•••" action drawer

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
  // The running app's live inspector actions → the in-app "•••" drawer (same bus
  // as the desktop menu-bar app menu). Empty ⇒ no "•••" button renders.
  const appActions = useInspectorInfo(activeApp?.id)?.actions ?? [];

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
    setSwitcher(false);
    // Zoom the app down to the home (real-iOS dismiss) when it's actually
    // front-most and we're not coming from the switcher; the app layer's
    // onAnimationEnd finalises (minimise + show home). Otherwise go straight home.
    if (topId && !home && !switcher) {
      setClosing(true);
      return;
    }
    setHome(true);
  };
  // Called by the app layer once the dismiss zoom finishes.
  const finishClose = () => {
    if (topId) minimizeWindow(topId);
    setClosing(false);
    setHome(true);
  };

  // Swipe down from the top notch zone WHILE an app is open → Control Center
  // (right half) / Notification Center (left half) — same split as the home, so
  // both are reachable in-app (real iOS), not only from the home screen.
  const onAppTopPointerDown = (e: React.PointerEvent) => {
    const sy = e.clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 2;
    let fired = false;
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", cleanup);
    };
    const move = (ev: PointerEvent) => {
      if (!fired && ev.clientY - sy > 40) {
        fired = true;
        cleanup();
        if (left) setNc(true);
        else setCc(true);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", cleanup);
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
      {/* --sai-top (notch/Dynamic-Island floor) now comes from the shared
          [data-shell="ios"] rule in globals.css — one source of truth for both
          touch shells, inherited by every iOS surface (home, nav, spotlight). */}
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
          className={cn(
            "absolute inset-0 z-[10] flex flex-col [transform-origin:center_bottom]",
            closing && "pointer-events-none", // lock interaction during the dismiss zoom
          )}
          style={{
            background: "var(--surface)",
            animation: `${closing ? "appClose" : "appOpen"} var(--shell-dur-slow) var(--shell-ease)`,
          }}
          // Finalise the dismiss only when the APP layer's OWN close animation
          // ends (guard against a child animation bubbling up).
          onAnimationEnd={(e) => {
            if (closing && e.target === e.currentTarget) finishClose();
          }}
        >
          {/* Top notch-zone swipe-catcher: pull down for NC (left) / CC (right)
              in-app. Covers only the empty safe-area strip above the nav row, so
              it never blocks the app icon / title / Done. */}
          <div
            className="absolute inset-x-0 top-0 z-[20] [touch-action:none]"
            style={{ height: "var(--sai-top)" }}
            onPointerDown={onAppTopPointerDown}
          />
          {/* Nav bar: transparent at rest, frosting into a hairline glass bar once
              the app scrolls (onScrollCapture on <main> catches the app's own inner
              scroll container generically). Title stays put — os-vps apps carry no
              in-content large title to fade in. */}
          <header
            className={cn(
              "shrink-0 border-b transition-[background-color,border-color] duration-200",
              appScrolled ? "glass border-border bg-[var(--glass-bar)]" : "border-transparent bg-transparent",
            )}
            style={{ paddingTop: "var(--sai-top)" }}
          >
            {/* iOS nav bar: 46px band below the notch. Title CENTERED (16/600);
                the leading app-icon (cockpit identity) + trailing Done are absolute
                so they never shift the centered title. */}
            <div className="relative flex h-[46px] items-center px-3.5">
              <span className="absolute left-3.5 top-1/2 size-[30px] -translate-y-1/2">
                <AppIcon app={activeApp} />
              </span>
              <span className="mx-auto max-w-[55%] truncate text-[16px] font-semibold">{activeApp.title}</span>
              {/* app-provided actions (inspector bus) → in-app drawer; sits left of Done */}
              {appActions.length > 0 && (
                <Button type="button" variant="ghost" aria-label="Actions" onClick={() => setActionsOpen(true)} className="absolute right-[54px] top-1/2 grid h-[44px] w-[44px] -translate-y-1/2 place-items-center rounded-md text-primary">
                  <MoreHorizontal className="size-5" />
                </Button>
              )}
              {/* primary exit control — 44pt HIG touch target */}
              <Button type="button" variant="ghost" onClick={goHome} className="absolute right-2 top-1/2 h-[44px] min-w-[44px] -translate-y-1/2 rounded-md px-3 text-sm font-medium text-primary">
                Done
              </Button>
            </div>
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
      {activeApp && (
        <AppActionsSheet app={activeApp} actions={appActions} open={actionsOpen} onOpenChange={setActionsOpen} />
      )}
      <Slot region="controlCenter" />
      <Slot region="topPill" />
      </div>
    </ShellUIProvider>
  );
}
