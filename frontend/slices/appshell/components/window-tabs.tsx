"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWindowOrder } from "../hooks/use-shell";
import { shellStore, closeWindow } from "../lib/store";
import { activateTab, ungroup } from "../lib/window-tabs";
import type { WinId } from "../lib/types";

// Tab strip for a merged window group — rendered under the title bar of the
// group's active frame. Click = activate (member inherits the frame rect),
// X = close that member, "Unstack" dissolves the group.
export function TabStrip({ groupId, activeId }: { groupId: string; activeId: WinId }) {
  const order = useWindowOrder();
  const members = order.filter((id) => shellStore.getWindow(id)?.groupId === groupId);
  if (members.length < 2) return null;

  return (
    <div className="flex h-8 shrink-0 items-stretch gap-px border-b border-border bg-muted/60 px-1 pt-1">
      {members.map((id) => {
        const win = shellStore.getWindow(id);
        if (!win) return null;
        const active = id === activeId;
        return (
          <div
            key={id}
            className={cn(
              "flex min-w-0 max-w-44 flex-1 items-center gap-1 rounded-t-md border border-b-0 px-2 text-xs",
              active ? "border-border bg-background font-medium" : "border-transparent bg-transparent text-muted-foreground hover:bg-background/50",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => activateTab(id, activeId)}
              className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-left font-normal hover:bg-transparent"
            >
              {win.title}
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Close ${win.title}`}
              onClick={() => closeWindow(id)}
              className="h-auto shrink-0 rounded p-0.5 font-normal hover:bg-muted"
            >
              <X className="size-3" />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={() => ungroup(groupId)}
        className="h-auto shrink-0 self-center rounded px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground hover:bg-muted"
      >
        Unstack
      </Button>
    </div>
  );
}
