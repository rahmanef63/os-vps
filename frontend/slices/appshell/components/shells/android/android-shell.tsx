"use client";
/* Android (Material-You) mobile shell — same store + apps as every other shell,
   one fullscreen app at a time (mirrors MobileShell). Chrome: status bar →
   pull-down notification shade with quick-settings tiles, search + app-grid
   home, swipe-up App Drawer, gesture nav (back / home / recents), and a Recents
   card deck. Drives the shared store only. Bottom inset system: the root sets
   `--android-nav` (NavBar row height); every surface that must clear the bottom
   chrome pads with `calc(var(--android-nav) + var(--sai-bottom))`. */
import { Button } from "@/components/ui/button";
import { useMemo, useState, type CSSProperties } from "react";
import { Search, ChevronLeft, Wifi, Battery, Signal, Bot } from "lucide-react";
import { useApps } from "../../../lib/registry";
import { useWindowOrder, useFocused, useWindow } from "../../../hooks/use-shell";
import { shellStore, openWindow, minimizeWindow, restoreWindow } from "../../../lib/store";
import { AppIcon } from "../../app-icon";
import { WindowContent } from "../../window-content";
import { registerShell } from "../../../registry/shells";
import { Clock, Recents, Shade } from "./android-parts";
import type { AppDescriptor } from "../../../lib/types";

function AndroidShell() {
  const apps = useApps();
  const order = useWindowOrder();
  const focused = useFocused();
  const [home, setHome] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [shade, setShade] = useState(false);
  const [recents, setRecents] = useState(false);

  const dockable = apps.filter((a) => !a.noDock);
  const topId =
    focused && !shellStore.getWindow(focused)?.minimized
      ? focused
      : ([...order].reverse().find((id) => !shellStore.getWindow(id)?.minimized) ?? null);
  const top = useWindow(topId ?? "__none__"); // reactive: re-renders on the active window's own payload/title changes
  const showApp = !home && !!top;
  const activeApp = top ? apps.find((a) => a.id === top.app) : null;

  const launch = (app: AppDescriptor) => {
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    setDrawer(false);
    setRecents(false);
    setHome(false);
  };
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

  return (
    <div
      className="absolute inset-0 z-[10] flex flex-col overflow-hidden bg-gradient-to-b from-[var(--brand-soft,#dbeafe)] via-background to-background text-foreground"
      style={{ "--android-nav": "48px" } as CSSProperties}
    >
      {/* Status bar: full-width tap opens the Shade — that IS real-Android
          behaviour (tap/swipe the status bar → quick settings), so it stays one
          deliberate control: labeled for AT and ≥32px hit height (h-8). */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShade(true)}
        aria-label="Open quick settings"
        inert={showApp}
        className="h-8 w-full shrink-0 justify-between rounded-none p-0 px-4 text-[11px] font-semibold hover:bg-transparent"
      >
        <Clock mode="time" />
        <span className="flex items-center gap-1">
          <Signal className="size-3" /> <Wifi className="size-3" /> <Battery className="size-3.5" />
        </span>
      </Button>

      {/* HOME (always mounted; app overlays it — inert while covered so its
          grid + NavBar drop out of tab/AT order under the z-20 app layer) */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-1" inert={showApp} aria-hidden={showApp}>
        <div className="mt-4 flex h-11 shrink-0 items-center gap-3 rounded-full border border-border bg-card/80 px-4 shadow-sm backdrop-blur">
          <Search className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search apps</span>
        </div>
        <div className="mt-6 grid min-h-0 grid-cols-4 content-start gap-x-3 gap-y-5 overflow-y-auto">
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
        <div className="absolute inset-0 z-[20] flex flex-col bg-background [animation:appOpen_.24s_cubic-bezier(.2,.8,.2,1)] [transform-origin:center_bottom]">
          <header className="flex h-12 shrink-0 items-center gap-3 px-3 text-white" style={{ background: activeApp.gradient }}>
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
      {shade && <Shade onClose={() => setShade(false)} />}
    </div>
  );
}

function AppCell({ app, onClick }: { app: AppDescriptor; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} className="h-auto p-0 font-normal hover:bg-transparent flex flex-col items-center gap-1.5">
      <span className="size-14"><AppIcon app={app} /></span>
      <span className="w-full truncate text-center text-[11px]">{app.title}</span>
    </Button>
  );
}

function NavBar({ inactive = false, onBack, onHome, onRecents }: { inactive?: boolean; onBack: () => void; onHome: () => void; onRecents: () => void }) {
  // 48px button row (--android-nav) + the device safe-area below it — the same
  // calc(var(--android-nav) + var(--sai-bottom)) total every overlay pads for.
  // `inactive` = this bar is covered by the app layer's own NavBar copy.
  return (
    <div
      className="flex shrink-0 items-center justify-around"
      style={{ height: "calc(var(--android-nav) + var(--sai-bottom))", paddingBottom: "var(--sai-bottom)" }}
      inert={inactive}
      aria-hidden={inactive}
    >
      <Button type="button" variant="ghost" onClick={onBack} aria-label="Back" className="h-auto p-0 font-normal hover:bg-transparent grid size-10 place-items-center">
        <ChevronLeft className="size-5" />
      </Button>
      <Button type="button" variant="ghost" onClick={onHome} aria-label="Home" className="h-auto p-0 font-normal hover:bg-transparent grid size-10 place-items-center">
        <span className="size-4 rounded-full border-2 border-foreground/70" />
      </Button>
      <Button type="button" variant="ghost" onClick={onRecents} aria-label="Recents" className="h-auto p-0 font-normal hover:bg-transparent grid size-10 place-items-center">
        <span className="size-3.5 rounded-[3px] border-2 border-foreground/70" />
      </Button>
    </div>
  );
}

function AppDrawer({ apps, onLaunch, onClose }: { apps: AppDescriptor[]; onLaunch: (a: AppDescriptor) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => apps.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())), [apps, q]);
  return (
    <div className="absolute inset-0 z-[30] flex flex-col bg-background/95 backdrop-blur-xl [animation:appOpen_.2s_ease]">
      <Button type="button" variant="ghost" onClick={onClose} className="h-auto p-0 font-normal hover:bg-transparent mx-auto mt-2 h-1 w-10 rounded-full bg-foreground/30" aria-label="Close" />
      <div className="mx-4 mt-3 flex h-11 items-center gap-3 rounded-full border border-border bg-card px-4">
        <Search className="size-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-4 content-start gap-x-3 gap-y-5 overflow-auto p-5"
        style={{ paddingBottom: "calc(var(--android-nav) + var(--sai-bottom))" }}
      >
        {list.map((a) => (
          <AppCell key={a.id} app={a} onClick={() => onLaunch(a)} />
        ))}
      </div>
    </div>
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
