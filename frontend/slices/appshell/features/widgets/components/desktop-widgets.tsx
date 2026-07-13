"use client";

import { createElement } from "react";
import { Check, LayoutGrid, Trash2 } from "lucide-react";
import { ContextMenu, registerCommands, registerContextMenu, toast, useContextMenu, type MenuItem } from "@/features/appshell";
import { cn } from "@/lib/utils";
import {
  getWidgetState,
  setPickerOpen,
  setWidgetSize,
  setWidgetsOn,
  toggleWidget,
  useWidgetState,
  type WidgetSize,
} from "../widget-registry";
import { WIDGET_RENDER } from "./widgets-defs";
import { WidgetPicker } from "./widget-picker";

// Desktop widgets — a glanceable, editable stack pinned to the wallpaper layer
// (behind every window), macOS-Sonoma style. Which widgets show + their order
// live in the widget-registry store; the WidgetPicker dialog edits them. Opened
// from the palette or the desktop right-click menu.

registerCommands("desktop-widgets", [
  {
    id: "widgets:desktop",
    label: "Toggle desktop widgets",
    hint: "Widgets",
    keywords: "glance dashboard wallpaper stats",
    run: () => {
      const next = !getWidgetState().on;
      setWidgetsOn(next);
      toast(next ? "Desktop widgets on" : "Desktop widgets off");
    },
  },
  {
    id: "widgets:configure",
    label: "Configure desktop widgets",
    hint: "Widgets",
    keywords: "desktop widget picker add remove reorder",
    run: () => setPickerOpen(true),
  },
]);

// Desktop right-click → open the picker (macOS shell only — that's where the
// widget stack + slot live).
registerContextMenu("macos", () => [
  { label: "Desktop widgets…", icon: LayoutGrid, onClick: () => setPickerOpen(true) },
]);

// Size → card width. Right edges align (parent is items-end), macOS-widget style.
const SIZE_W: Record<WidgetSize, string> = { s: "w-44", m: "w-60", l: "w-72" };

// One widget in the stack. Sized by its saved WidgetSize; right-click sets S/M/L
// (current size checked), removes it, or opens the picker. pointer-events-auto so
// the right-click lands on the widget, not the wallpaper below.
function DesktopWidget({ id, size }: { id: string; size: WidgetSize }) {
  const ctx = useContextMenu();
  const Render = WIDGET_RENDER[id];
  if (!Render) return null;
  const items: MenuItem[] = [
    { label: "Small", icon: size === "s" ? Check : undefined, onClick: () => setWidgetSize(id, "s") },
    { label: "Medium", icon: size === "m" ? Check : undefined, onClick: () => setWidgetSize(id, "m") },
    { label: "Large", icon: size === "l" ? Check : undefined, onClick: () => setWidgetSize(id, "l") },
    { type: "sep" },
    { label: "Remove widget", icon: Trash2, onClick: () => toggleWidget(id) },
    { label: "Desktop widgets…", icon: LayoutGrid, onClick: () => setPickerOpen(true) },
  ];
  return (
    // stopPropagation so the right-click opens THIS widget's menu, not the
    // desktop-background menu it would otherwise bubble up to.
    <div
      className={cn("pointer-events-auto", SIZE_W[size])}
      onContextMenu={(e) => {
        e.stopPropagation();
        ctx.open(e);
      }}
    >
      {createElement(Render)}
      <ContextMenu pos={ctx.pos} items={items} onClose={ctx.close} />
    </div>
  );
}

export function DesktopWidgets() {
  const { on, enabled, sizes } = useWidgetState();
  return (
    <>
      <WidgetPicker />
      {on && (
        <div className="pointer-events-none absolute right-4 top-4 z-[5] flex flex-col items-end gap-3">
          {enabled.map((id) => (
            <DesktopWidget key={id} id={id} size={sizes[id] ?? "m"} />
          ))}
        </div>
      )}
    </>
  );
}
