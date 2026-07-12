"use client";

import { createElement } from "react";
import { registerCommands, toast } from "@/features/appshell";
import { WIDGET_META, getWidgetState, isWidgetOn, setWidgetsOn, toggleWidget, useWidgetState } from "../widget-registry";
import { WIDGET_RENDER } from "./widgets-defs";

// Desktop widgets — a glanceable, editable stack pinned to the wallpaper layer
// (behind every window), macOS-Sonoma style. The master toggle + which widgets
// show are palette-driven (below) and persist. ponytail: config via Spotlight
// commands, no picker dialog yet — a proper picker + drag are a later slice.

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
  // One toggle per widget type, so the stack is an editable set from Spotlight.
  ...WIDGET_META.map((w) => ({
    id: `widgets:toggle:${w.id}`,
    label: `Toggle ${w.title} widget`,
    hint: "Widgets",
    keywords: `desktop widget ${w.title}`,
    run: () => {
      toggleWidget(w.id);
      toast(`${w.title} widget ${isWidgetOn(w.id) ? "added" : "removed"}`);
    },
  })),
]);

export function DesktopWidgets() {
  const { on, enabled } = useWidgetState();
  if (!on) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-12 z-[5] flex w-60 flex-col gap-3">
      {enabled.map((id) => {
        const Render = WIDGET_RENDER[id];
        return Render ? createElement(Render, { key: id }) : null;
      })}
    </div>
  );
}
