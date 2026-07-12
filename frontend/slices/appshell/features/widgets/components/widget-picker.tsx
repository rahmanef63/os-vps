"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  WIDGET_META,
  moveWidget,
  setPickerOpen,
  setWidgetsOn,
  toggleWidget,
  usePickerOpen,
  useWidgetState,
} from "../widget-registry";

// Desktop-widget picker — choose which widgets show on the wallpaper stack and
// reorder them (up/down). Opened from the palette ("Configure desktop widgets")
// or the desktop right-click menu. ponytail: up/down reorder, no free drag yet.
export function WidgetPicker() {
  const open = usePickerOpen();
  const { on, enabled } = useWidgetState();

  const shown = enabled
    .map((id) => WIDGET_META.find((w) => w.id === id))
    .filter((w): w is (typeof WIDGET_META)[number] => !!w);
  const available = WIDGET_META.filter((w) => !enabled.includes(w.id));

  return (
    <Dialog open={open} onOpenChange={setPickerOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Desktop widgets</DialogTitle>
          <DialogDescription>Pick widgets for the wallpaper stack and set their order.</DialogDescription>
        </DialogHeader>

        <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <span className="font-medium">Show desktop widgets</span>
          <Switch checked={on} onCheckedChange={setWidgetsOn} />
        </label>

        <div className="flex flex-col gap-1.5">
          {shown.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
              <span className="flex-1">{w.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={i === 0}
                onClick={() => moveWidget(w.id, -1)}
                aria-label={`Move ${w.title} up`}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={i === shown.length - 1}
                onClick={() => moveWidget(w.id, 1)}
                aria-label={`Move ${w.title} down`}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Switch checked onCheckedChange={() => toggleWidget(w.id)} aria-label={`Remove ${w.title}`} />
            </div>
          ))}

          {available.length > 0 && (
            <div className="mt-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Available
            </div>
          )}
          {available.map((w) => (
            <div key={w.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
              <span className="flex-1 text-muted-foreground">{w.title}</span>
              <Switch checked={false} onCheckedChange={() => toggleWidget(w.id)} aria-label={`Add ${w.title}`} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
