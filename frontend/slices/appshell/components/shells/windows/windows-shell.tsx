"use client";
/* Windows 11 desktop shell — same window store + apps + feature slots as macOS,
   only the chrome differs (centered taskbar + Start instead of menu bar + dock,
   caption-button windows instead of traffic lights). Drives the SHARED store;
   it never forks window state. Sets a bottom taskbar inset so snap/maximize tile
   above the taskbar (macOS dock inset is restored on unmount). */
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AppWindow, LayoutGrid, Minimize2, Maximize2 } from "lucide-react";
import { useWindowOrder, useWindowsMap } from "../../../hooks/use-shell";
import { useOverviewKey } from "../../../hooks/use-overview-key";
import { Slot } from "../../../registry/feature-registry";
import { registerShell } from "../../../registry/shells";
import { useShellAppearance } from "../../../registry/capabilities";
import { shellStore, stackByZ, minimizeAll, restoreWindow, applyChromeInsets } from "../../../lib/store";
import { Window } from "../../window";
import { AppSwitcher } from "../../app-switcher";
import { NotificationCenter } from "../../notification-center";
import { WindowOverview } from "../window-overview";
import { ShellContextMenu, useShellContextMenu, type MenuItem } from "../context-menu";
import { Taskbar, TASKBAR_H } from "./taskbar";
import { SnapAssist } from "./snap-assist";

function WindowsShell() {
  const order = useWindowOrder();
  const winMap = useWindowsMap();
  const stacked = useMemo(() => stackByZ(order, winMap), [order, winMap]);
  const [taskView, setTaskView] = useState(false);
  const menu = useShellContextMenu("windows");
  const interactive = !!useShellAppearance().liveWallpaper?.interactive;
  useOverviewKey(() => setTaskView((v) => !v)); // F3 toggles Task View, parity with macOS Mission Control
  useEffect(() => {
    applyChromeInsets({ top: 0, bottom: TASKBAR_H });
    return () => applyChromeInsets({}); // restore macOS insets + re-tile snapped windows
  }, []);
  const baseItems: MenuItem[] = [
    { label: "Task View", icon: LayoutGrid, onClick: () => setTaskView(true) },
    { type: "sep" },
    { label: "Show all windows", icon: Maximize2, disabled: order.length === 0, onClick: () => order.forEach((id) => shellStore.getWindow(id)?.minimized && restoreWindow(id)) },
    { label: "Minimize all", icon: Minimize2, disabled: order.length === 0, onClick: () => minimizeAll() },
  ];
  return (
    <>
      <Slot region="desktopWidgets" />
      {/* The window layer also carries the desktop right-click (only when the
          click lands on the bare section, not a window). When an interactive
          live wallpaper is active it goes click-through so the wallpaper gets
          empty-desktop clicks; windows stay interactive. */}
      <section
        className={cn("absolute inset-0 z-[10]", interactive && "pointer-events-none [&>*]:pointer-events-auto")}
        onContextMenu={(e) => { if (e.target === e.currentTarget) menu.open(e, baseItems); }}
      >
        {stacked.map((id) => (
          <Window key={id} id={id} variant="windows" />
        ))}
      </section>
      <Slot region="rightPanel" />
      <NotificationCenter />
      <AppSwitcher />
      <SnapAssist />
      <Taskbar onTaskView={() => setTaskView((v) => !v)} />
      {taskView && <WindowOverview onClose={() => setTaskView(false)} label="Task View" />}
      <ShellContextMenu state={menu.state} onClose={menu.close} />
    </>
  );
}

registerShell({
  id: "windows",
  label: "Windows",
  icon: AppWindow,
  surface: "desktop",
  group: "Desktop",
  windowed: true,
  wallpaper: "win11",
  render: WindowsShell,
});

export { WindowsShell };
