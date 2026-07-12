"use client";

import { createElement } from "react";
import { LayoutGrid } from "lucide-react";
import { registerCommands, registerContextMenu, toast } from "@/features/appshell";
import { getWidgetState, setPickerOpen, setWidgetsOn, useWidgetState } from "../widget-registry";
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

export function DesktopWidgets() {
  const { on, enabled } = useWidgetState();
  return (
    <>
      <WidgetPicker />
      {on && (
        <div className="pointer-events-none absolute right-4 top-12 z-[5] flex w-60 flex-col gap-3">
          {enabled.map((id) => {
            const Render = WIDGET_RENDER[id];
            return Render ? createElement(Render, { key: id }) : null;
          })}
        </div>
      )}
    </>
  );
}
