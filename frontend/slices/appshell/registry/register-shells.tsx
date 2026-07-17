"use client";
// Lazy shell registration. The non-default shells (Windows / Android / Dashboard)
// register their METADATA eagerly here — so resolveShell() + the shell switcher
// work at startup — but their COMPONENT is React.lazy, so each becomes its own
// chunk: a phone never downloads the desktop chrome it can't reach by default.
// The Surface (desktop.tsx) wraps the shell in <Suspense>, so SSR renders the
// fallback rather than a client-only shell (also removes the #418 hydration
// mismatch). macOS + iOS stay EAGER in desktop.tsx (zero-flash defaults; their
// components share desktop.tsx with the Surface, so they can't split cleanly here).
import { lazy } from "react";
import { AppWindow, Bot, Activity } from "lucide-react";
import { registerShell } from "./shells";

registerShell({
  id: "windows",
  label: "Windows",
  icon: AppWindow,
  surface: "desktop",
  group: "Desktop",
  windowed: true,
  wallpaper: "win11",
  render: lazy(() => import("../components/shells/windows/windows-shell").then((m) => ({ default: m.WindowsShell }))),
});
registerShell({
  id: "android",
  label: "Android",
  icon: Bot,
  surface: "mobile",
  group: "Mobile",
  wallpaper: "material",
  render: lazy(() => import("../components/shells/android/android-shell").then((m) => ({ default: m.AndroidShell }))),
});
registerShell({
  id: "dashboard",
  label: "Dashboard",
  icon: Activity,
  surface: "desktop",
  group: "Desktop",
  wallpaper: "graphite",
  render: lazy(() => import("../components/shells/dashboard/dashboard-shell").then((m) => ({ default: m.DashboardShell }))),
});
