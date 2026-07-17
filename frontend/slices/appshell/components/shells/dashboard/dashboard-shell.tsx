"use client";
/* Dashboard shell — a single-pane cockpit surface (no floating windows):
   sidebar + breadcrumb + content. Lives in the appshell FRAMEWORK (converged to
   the rr shape) and stays brand-free: brand via useBrand(), host stats via the
   injected useSystemStats capability — no project @/lib coupling. It DRIVES the
   shared window store: launching calls openWindow, the pane shows the focused
   (or newest non-minimized) window via <WindowContent>, Home minimizes it — so
   UrlSync deep links work here and open windows (with their payloads) carry over
   intact when switching to the macOS/Windows/mobile shells. */
import { useMemo, useState } from "react";
import { useUrlHome } from "../../../hooks/use-url-home";
import { LayoutDashboard, Home, Activity, Search } from "lucide-react";
import { registerShell } from "../../../registry/shells";
import { useShellConfig } from "../../../registry/shell-config";
import { useBrand } from "../../../registry/brand";
import { useApps } from "../../../lib/registry";
import { useWindowOrder, useFocused, useWindow } from "../../../hooks/use-shell";
import { shellStore, openWindow, minimizeWindow, restoreWindow } from "../../../lib/store";
import { AppIcon } from "../../app-icon";
import { WindowContent } from "../../window-content";
import { ShellContextMenu, useShellContextMenu } from "../context-menu";
import { useInspectorInfo } from "../../../lib/inspector";
import { ResponsiveToolbar } from "../../../primitives/responsive-toolbar";
import { ControlCenterDesktop } from "../../../features/control-center/components/control-center-desktop";
import type { AppDescriptor } from "../../../lib/types";
import { DashboardHome, NavItem, RunningRow, SidebarLabel } from "./dashboard-parts";

function DashboardShell() {
  const brand = useBrand();
  const allApps = useApps();
  const apps = allApps.filter((a) => !a.noDock);
  const [q, setQ] = useState("");
  const menu = useShellContextMenu("dashboard");
  const filtered = useMemo(
    () => apps.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())),
    [apps, q],
  );

  // URL → view, same derivation as the mobile shell: a pathname naming an app
  // slug shows the app pane (UrlSync opens/focuses its window in the shared
  // store), anything else shows Home. User gestures override, keyed to the
  // pathname they were made at, so the derivation wins again when the URL
  // actually changes — no effect-driven setState.
  const { routing } = useShellConfig();
  const { home, setHome } = useUrlHome(allApps, routing);

  // The pane shows the FOCUSED window — fall back to the newest non-minimized
  // one (`order` is append-only and doesn't track focus).
  const order = useWindowOrder();
  const focused = useFocused();
  const topId =
    focused && !shellStore.getWindow(focused)?.minimized
      ? focused
      : ([...order].reverse().find((id) => !shellStore.getWindow(id)?.minimized) ?? null);
  const top = useWindow(topId ?? "__none__"); // reactive: re-renders on the active window's payload/title changes
  const pane = !home && top ? top : null;
  // The focused app's live actions (Refresh, Clear, Render…) — the same inspector
  // bus the macOS menu + mobile ••• sheet use. Dashboard had no path to invoke them.
  const paneActions = useInspectorInfo(pane?.app)?.actions ?? [];

  // SSOT navigation: open / resume bring a window to the front; Home minimizes.
  const launch = (app: AppDescriptor) => {
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    setHome(false);
  };
  const resume = (id: string) => {
    restoreWindow(id);
    setHome(false);
  };
  const goHome = () => {
    if (topId) minimizeWindow(topId);
    setHome(true);
  };

  return (
    <div className="absolute inset-0 z-[10] flex bg-background/85 backdrop-blur-xl">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/50">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4 text-sm font-semibold">
          <LayoutDashboard className="size-4 text-primary" /> {brand.name}
          <div className="ml-auto"><ControlCenterDesktop /></div>
        </div>

        <div className="flex flex-col gap-0.5 px-2">
          <NavItem active={!pane} onClick={goHome} icon={<Home className="size-4" />} label="Home" />
        </div>

        {order.length > 0 && (
          <>
            <SidebarLabel>Running</SidebarLabel>
            <div className="flex flex-col gap-0.5 px-2">
              {order.map((id) => (
                <RunningRow key={id} id={id} active={pane?.id === id} onPick={() => resume(id)} />
              ))}
            </div>
          </>
        )}

        <SidebarLabel>Apps</SidebarLabel>
        <div className="px-2 pb-1.5">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter apps"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-2 pb-3">
          {filtered.map((a) => (
            <NavItem
              key={a.id}
              active={pane?.app === a.id}
              onClick={() => launch(a)}
              icon={<span className="size-5"><AppIcon app={a} /></span>}
              label={a.title}
            />
          ))}
          {filtered.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">No apps</div>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-5 text-sm">
          <button onClick={goHome} className="text-muted-foreground transition-colors hover:text-foreground">Home</button>
          {pane && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium">{pane.title}</span>
            </>
          )}
          {pane && paneActions.length > 0 && (
            <div className="ml-auto">
              <ResponsiveToolbar
                items={paneActions.map((a) => ({ id: a.id, label: a.label, onClick: () => void a.run() }))}
              />
            </div>
          )}
        </header>
        {/* container context is REQUIRED: app @container styles never match without it.
            Right-click the Home view opens the (registry-driven) dashboard menu;
            inside an open app the native right-click is left alone. */}
        <main
          className="min-h-0 flex-1 overflow-hidden [container-type:inline-size]"
          onContextMenu={(e) => { if (!pane) menu.open(e); }}
        >
          {pane ? (
            <WindowContent key={pane.id} app={pane.app} payload={pane.payload} winId={pane.id} />
          ) : (
            <DashboardHome apps={apps} onOpenApp={launch} />
          )}
        </main>
      </div>
      <ShellContextMenu state={menu.state} onClose={menu.close} />
    </div>
  );
}

registerShell({
  id: "dashboard",
  label: "Dashboard",
  icon: Activity,
  surface: "desktop",
  group: "Desktop",
  wallpaper: "graphite",
  render: DashboardShell,
});

export { DashboardShell };
