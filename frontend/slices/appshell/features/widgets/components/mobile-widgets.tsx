"use client";

import { createElement } from "react";
import { Button } from "@/components/ui/button";
import { useApps, useShellUI, AppIcon, type AppDescriptor } from "@/features/appshell";
import { Card } from "./widget-cards";
import { useWidgetState } from "../widget-registry";
import { WIDGET_RENDER } from "./widgets-defs";

// Today view (swipe right from home) — renders the SAME editable widget set the
// desktop stack uses (widget-registry), so a user's chosen widgets (Clock/Notes/
// Quicklinks/system) follow them to mobile. Widgets here are naturally
// interactive (no pointer-events-none wrapper). Plus a mobile-only "Quick open"
// app row from the shell-UI context.
export function MobileWidgets() {
  const apps = useApps();
  const { quickAppIds: quickIds, openApp: onOpen } = useShellUI();
  const { enabled } = useWidgetState();

  const quick = quickIds.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as AppDescriptor[];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3 [scrollbar-width:none]">
      <h2 className="px-1 text-lg font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">Today</h2>

      {enabled.map((id) => {
        const Render = WIDGET_RENDER[id];
        return Render ? createElement(Render, { key: id }) : null;
      })}

      {quick.length > 0 && (
        <Card>
          <span className="mb-2 block text-[12px] font-semibold text-muted-foreground">Quick open</span>
          <div className="flex gap-4">
            {quick.map((app) => (
              <Button key={app.id} type="button" variant="ghost" onClick={() => onOpen(app)} className="h-auto p-0 hover:bg-transparent flex flex-col items-center gap-1.5">
                <span className="size-12">
                  <AppIcon app={app} />
                </span>
                <span className="max-w-[56px] truncate text-[10.5px] font-medium">{app.title}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
