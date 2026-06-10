"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Monitor, Smartphone, Grid3x3, Minimize2, Maximize2, X } from "lucide-react";
import { useResponsive } from "../responsive/use-responsive";
import { useWindowOrder } from "../hooks/use-shell";
import { usePersistLayout } from "../hooks/use-persist-layout";
import { useOverviewKey } from "../hooks/use-overview-key";
import { MenuBar } from "./menu-bar";
import { Dock } from "./dock";
import { AppLauncher } from "./app-launcher";
import { Wallpaper } from "./wallpaper";
import { MobileShell } from "./mobile-shell";
import { Window } from "./window";
import { Slot } from "../registry/feature-registry";
import { toggleSpotlight, toggleInspector, snapWindow, toggleMaximize, minimizeWindow, minimizeAll, restoreWindow, closeAll, shellStore } from "../lib/store";
import { WindowOverview } from "./shells/window-overview";
import { NotificationCenter } from "./notification-center";
import { AppSwitcher } from "./app-switcher";
import { ContextMenu, useContextMenu } from "./shells/context-menu";
import { registerShell, resolveShell, useShellPrefs } from "../registry/shells";
// side-effects: shell + palette-command registrations
import "./shells/windows/windows-shell";
import "./shells/android/android-shell";
import "../lib/window-commands";
import "../lib/spaces";
import "../lib/window-tabs";
import "../lib/focus-mode";
import "../lib/profiles";
// NOTE: the Dashboard shell lives in the APP layer (data-agnostic slice).

// The OS surface. The app registry + responsive providers mount in AppShell
// (above the feature-provider seam — see provider/app-shell.tsx), so this is
// the pure chrome layer.
export function OsDesktop() {
  return <Surface />;
}

function Surface() {
  const r = useResponsive();
  const prefs = useShellPrefs();

  // The live form factor picks the surface; the user's per-surface preference
  // picks WHICH shell renders there (desktop look vs mobile look, chosen
  // independently in Settings). A mobile shell on a wide viewport (device
  // override = phone) previews inside a phone frame; a real narrow screen fills.
  const surface = r.isMobile ? "mobile" : "desktop";
  const desc = resolveShell(surface, prefs);
  const Comp = desc.render;

  usePersistLayout();
  useSpotlightHotkey();
  useInspectorHotkey();
  // Only windowed shells (macOS/Windows) react to ⌘+Arrow snap — otherwise the
  // hotkey would silently snap the hidden focused window under a single-pane or
  // mobile shell, surprising the user when they switch back.
  useWindowSnapKeys(!!desc.windowed);
  const framed = surface === "mobile" && r.vw >= 768;

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <Wallpaper shellDefault={desc.wallpaper} />
      {framed ? <PhoneFrame Comp={Comp} /> : <Comp />}
      <Slot region="overlay" />
      <Slot region="notifications" />
    </div>
  );
}

// Centered device frame so a phone shell can be previewed on a desktop screen.
function PhoneFrame({ Comp }: { Comp: ComponentType }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-[844px] max-h-[92vh] w-[390px] max-w-[92vw] overflow-hidden rounded-[2.5rem] border-[6px] border-black/80 bg-background shadow-2xl">
        <Comp />
      </div>
    </div>
  );
}

// ⌘K / Ctrl+K toggles Spotlight from anywhere on the desktop.
function useSpotlightHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSpotlight();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// ⌘I / Ctrl+I toggles the AI Inspector.
function useInspectorHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        toggleInspector();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// ⌘/Ctrl + Arrow snaps the focused window: ←/→ half, ↑ maximize, ↓ restore or
// minimize. Skipped while typing in a field. Disabled on non-windowed shells
// (single-pane / mobile) so it never tiles a window the user can't see.
function useWindowSnapKeys(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (!e.key.startsWith("Arrow")) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const id = shellStore.getFocused();
      if (!id) return;
      const win = shellStore.getWindow(id);
      if (!win) return;
      e.preventDefault();
      switch (e.key) {
        case "ArrowLeft": snapWindow(id, "left"); break;
        case "ArrowRight": snapWindow(id, "right"); break;
        case "ArrowUp": if (!win.maximized) toggleMaximize(id); break;
        case "ArrowDown": if (win.maximized) toggleMaximize(id); else minimizeWindow(id); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

function DesktopChrome() {
  const order = useWindowOrder();
  const [overview, setOverview] = useState(false);
  const menu = useContextMenu();
  useOverviewKey(() => setOverview(true));
  return (
    <>
      <MenuBar />
      <Slot region="desktopWidgets" />
      <section
        className="absolute inset-x-0 bottom-0 top-[30px] z-[10]"
        // Only the empty desktop opens the menu — clicks inside an app window
        // (which sit in child layers) keep their native right-click.
        onContextMenu={(e) => { if (e.target === e.currentTarget) menu.open(e); }}
      >
        {order.map((id) => (
          <Window key={id} id={id} />
        ))}
      </section>
      <Slot region="rightPanel" />
      <NotificationCenter />
      <AppSwitcher />
      <AppLauncher />
      <Dock onMissionControl={() => setOverview(true)} />
      {overview && <WindowOverview onClose={() => setOverview(false)} label="Mission Control" />}
      <ContextMenu
        pos={menu.pos}
        onClose={menu.close}
        items={[
          { label: "Mission Control", icon: Grid3x3, onClick: () => setOverview(true) },
          { type: "sep" },
          { label: "Show all windows", icon: Maximize2, disabled: order.length === 0, onClick: () => order.forEach((id) => shellStore.getWindow(id)?.minimized && restoreWindow(id)) },
          { label: "Minimize all", icon: Minimize2, disabled: order.length === 0, onClick: () => minimizeAll() },
          { label: "Close all", icon: X, disabled: order.length === 0, onClick: () => closeAll() },
        ]}
      />
    </>
  );
}

// The two built-in shells. Later phases register windows / dashboard / android /
// mobile-dashboard into the same registry.
registerShell({ id: "macos", label: "macOS", icon: Monitor, surface: "desktop", group: "Desktop", windowed: true, wallpaper: "aurora", render: DesktopChrome });
registerShell({ id: "ios", label: "iOS", icon: Smartphone, surface: "mobile", group: "Mobile", wallpaper: "ios", render: MobileShell });
