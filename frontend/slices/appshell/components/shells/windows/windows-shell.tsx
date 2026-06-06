"use client";
/* Windows 11 desktop shell — same window store + apps + feature slots as macOS,
   only the chrome differs (centered taskbar + Start instead of menu bar + dock,
   caption-button windows instead of traffic lights). Drives the SHARED store;
   it never forks window state. Sets a bottom taskbar inset so snap/maximize tile
   above the taskbar (macOS dock inset is restored on unmount). */
import { useEffect, useState } from "react";
import { AppWindow, LayoutGrid, Minimize2, Maximize2 } from "lucide-react";
import { useWindowOrder } from "../../../hooks/use-shell";
import { Slot } from "../../../registry/feature-registry";
import { registerShell } from "../../../registry/shells";
import { shellStore, minimizeAll, restoreWindow, applyChromeInsets } from "../../../lib/store";
import { Window } from "../../window";
import { WindowOverview } from "../window-overview";
import { ContextMenu, useContextMenu } from "../context-menu";
import { Taskbar, TASKBAR_H } from "./taskbar";
import { SnapAssist } from "./snap-assist";

function WindowsShell() {
  const order = useWindowOrder();
  const [taskView, setTaskView] = useState(false);
  const menu = useContextMenu();
  useEffect(() => {
    applyChromeInsets({ top: 0, bottom: TASKBAR_H });
    return () => applyChromeInsets({}); // restore macOS insets + re-tile snapped windows
  }, []);
  return (
    <>
      {/* Transparent desktop layer — lets the shared <Wallpaper> (preset OR the
          user's custom image, from Settings) show through, same as macOS. Carries
          the desktop right-click; sits below the window layer so windows keep
          their own context menu. */}
      <div className="absolute inset-0" onContextMenu={menu.open} />
      <section className="absolute inset-0 z-[10]">
        {order.map((id) => (
          <Window key={id} id={id} variant="windows" />
        ))}
      </section>
      <Slot region="rightPanel" />
      <SnapAssist />
      <Taskbar onTaskView={() => setTaskView((v) => !v)} />
      {taskView && <WindowOverview onClose={() => setTaskView(false)} label="Task View" />}
      <ContextMenu
        pos={menu.pos}
        onClose={menu.close}
        items={[
          { label: "Task View", icon: LayoutGrid, onClick: () => setTaskView(true) },
          { type: "sep" },
          { label: "Show all windows", icon: Maximize2, disabled: order.length === 0, onClick: () => order.forEach((id) => shellStore.getWindow(id)?.minimized && restoreWindow(id)) },
          { label: "Minimize all", icon: Minimize2, disabled: order.length === 0, onClick: () => minimizeAll() },
        ]}
      />
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
